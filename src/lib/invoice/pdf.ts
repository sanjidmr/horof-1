/**
 * Server-side PDF generation for invoices using puppeteer-core with the
 * system-installed Chrome/Edge. Renders the exact invoice HTML to a crisp,
 * multi-page A4 PDF with zero layout loss.
 */
import { launch } from 'puppeteer-core';
import { existsSync } from 'node:fs';

/** Locate a usable Chrome/Edge executable on Windows, macOS, and Linux. */
export function findChromeExecutable(): string | null {
  if (process.env.CHROME_PATH && process.env.CHROME_PATH.length > 0) {
    return process.env.CHROME_PATH;
  }

  const candidates: string[] = [
    process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
    process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return null;
}

let browserPromise: ReturnType<typeof launch> | null = null;

async function getBrowser() {
  if (!browserPromise) {
    const executablePath = findChromeExecutable();
    if (!executablePath) {
      throw new Error(
        'No Chrome/Edge installation found. Set the CHROME_PATH environment variable to the browser executable path to enable PDF generation.'
      );
    }
    browserPromise = launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--hide-scrollbars',
        '--font-render-hinting=none',
      ],
    });
  }
  return browserPromise;
}

/** Render a full HTML document string to an A4 PDF buffer. */
export async function renderHtmlToPdf(html: string, options?: { filename?: string }): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'networkidle0' as any, timeout: 45_000 });
    await page.evaluate(() => document.fonts?.ready);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

/** Gracefully close the shared browser (best-effort; used in dev/reloads). */
export async function closePdfBrowser(): Promise<void> {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      await b.close();
    } catch {
      /* ignore */
    }
    browserPromise = null;
  }
}
