import { mkdirSync } from 'node:fs';
import { auditRegression } from './audit-regression.mjs';
const baseUrl = process.env.KIRINA_URL;
if (!baseUrl) throw new Error('Set KIRINA_URL to the isolated local test server.');
const { chromium } = await import(process.env.PLAYWRIGHT_ENTRY ?? 'playwright');
const outDir = new URL('../.browser-check/', import.meta.url);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try { await auditRegression(browser, baseUrl, outDir); }
finally { await browser.close(); }
