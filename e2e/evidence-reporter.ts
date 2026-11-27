import { copyFileSync, mkdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'

/**
 * Copies each test's screenshot and video to `outputDir`, named by test title
 * and project: `<title>-<project>.png` and `<title>-<project>.webm`.
 */
export default class EvidenceReporter implements Reporter {
  private readonly outputDir: string
  private readonly copies: { from: string; to: string }[] = []

  constructor({ outputDir }: { outputDir: string }) {
    this.outputDir = outputDir
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const base = `${slug(test.title)}-${test.parent.project()?.name ?? 'default'}`
    for (const attachment of result.attachments) {
      if (!attachment.path || !['screenshot', 'video'].includes(attachment.name)) continue
      this.copies.push({
        from: attachment.path,
        to: join(this.outputDir, base + extname(attachment.path)),
      })
    }
  }

  onEnd() {
    mkdirSync(this.outputDir, { recursive: true })
    for (const { from, to } of this.copies) copyFileSync(from, to)
    console.log(`Evidence: ${this.copies.length} files written to ${this.outputDir}`)
  }
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
