import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { expect, test, type Page } from '@playwright/test'

const run = promisify(execFile)

// The README's examples call the service where `make dev` and the image put it.
const README_ORIGIN = 'http://localhost:8080'

type Example = { command: string; output: string }

/**
 * Every ```bash block in the README whose command starts with `curl`, paired
 * with the ```http block that follows it: the response the command prints.
 */
function readmeExamples(): Example[] {
  const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')
  const blocks = [...readme.matchAll(/^```(\w+)\n([\s\S]*?)^```$/gm)].map(([, lang, body]) => ({
    lang,
    body: body.trimEnd(),
  }))
  return blocks.flatMap((block, i) => {
    if (block.lang !== 'bash' || !block.body.startsWith('curl ')) return []
    const next = blocks[i + 1]
    if (next?.lang !== 'http') throw new Error(`no http output block after: ${block.body}`)
    return [{ command: block.body, output: next.body }]
  })
}

/** Headers end in CRLF, and `Date` is shown in the README as `Date: …`. */
function normalise(output: string): string {
  return output
    .replace(/\r\n/g, '\n')
    .replace(/^Date: .*$/m, 'Date: …')
    .trimEnd()
}

// The service answers the same on every viewport, so the 360 px project skips
// this test before it opens a page.
test.skip(({ isMobile }) => isMobile, 'the service answers the same on every viewport')

test(
  'every curl example in the README prints the response shown under it',
  { tag: '@issue-15' },
  async ({ page, baseURL }) => {
    const examples = readmeExamples()
    expect(examples.length).toBeGreaterThan(0)

    const transcript: Example[] = []
    for (const { command, output } of examples) {
      await test.step(command, async () => {
        const { stdout } = await run('sh', ['-c', command.replaceAll(README_ORIGIN, baseURL!)])
        const printed = normalise(stdout)
        transcript.push({ command, output: printed })
        expect(printed).toBe(output)
      })
    }

    await showTranscript(page, transcript)
  },
)

/**
 * The evidence for this test: each command above what the service printed,
 * with the viewport grown so the screenshot holds the whole transcript.
 */
async function showTranscript(page: Page, transcript: Example[]) {
  const pre = 'margin: 0; white-space: pre-wrap; overflow-wrap: anywhere'
  await page.setContent(
    `<main style="font: 12px/1.4 ui-monospace, monospace; padding: 16px">${transcript
      .map(
        ({ command, output }) =>
          `<pre style="${pre}; color: #555">$ ${escapeHtml(command)}</pre>` +
          `<pre style="${pre}; margin-bottom: 14px">${escapeHtml(output)}</pre>`,
      )
      .join('')}</main>`,
  )
  await expect(page.locator('pre')).toHaveCount(2 * transcript.length)
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.setViewportSize({ width: page.viewportSize()!.width, height })
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
