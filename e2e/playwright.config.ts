import { defineConfig, devices, type ReporterDescription } from '@playwright/test'

const PORT = 8787
const baseURL = `http://localhost:${PORT}`

// `make evidence ISSUE=<n>` sets EVIDENCE_DIR: every test then records a
// screenshot and a video, and the evidence reporter copies them there.
const evidenceDir = process.env.EVIDENCE_DIR
const reporter: ReporterDescription[] = [[process.env.CI ? 'github' : 'list']]
if (evidenceDir) reporter.push(['./evidence-reporter.ts', { outputDir: evidenceDir }])

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: evidenceDir ? 'on' : 'off',
    video: evidenceDir ? 'on' : 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-360',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 780 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  // The real binary serving the built app, as in the Docker image.
  webServer: {
    command: `make -C .. build && PORT=${PORT} STATIC_DIR=../frontend/dist ../bin/calculator`,
    url: `${baseURL}/healthz`,
    // Evidence always records the current build, never a server left running.
    reuseExistingServer: !process.env.CI && !evidenceDir,
    timeout: 180_000,
  },
})
