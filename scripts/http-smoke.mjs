import { lessons } from "../src/data/curriculum.js";
import { visualAssets } from "../src/data/visuals/assets.ts";
import { BUNDLED_SPEECH_ASSETS } from "../src/data/speech-assets.generated.js";
import { getSiteOrigin, privateRoutes, sitePages } from "../src/lib/site-metadata.ts";

const baseArg = process.argv.find((arg) => arg.startsWith("--base="));
const baseUrl = baseArg?.slice("--base=".length) ?? process.env.KIRINA_URL;

if (!baseUrl) {
  console.error("Set KIRINA_URL or pass --base=http://127.0.0.1:<port> so smoke tests cannot hit another local app by accident.");
  process.exit(1);
}

const manifestPath = "/manifest.webmanifest";
const failures = [];
const pageTitles = new Map();
const removedOfflinePaths = ["/sw.js", "/offline.html"];
const manifest = await fetchJson(manifestPath);
const manifestIconPaths = collectManifestIconPaths(manifest);
const manifestImagePaths = collectManifestImagePaths(manifest);
const shortcutPaths = collectShortcutPaths(manifest);
const speechSamplePaths = ["가", "우유", "안녕하세요"].map((text) => BUNDLED_SPEECH_ASSETS[text]).filter(Boolean);

const paths = [
  "/",
  "/path",
  "/self-study",
  "/hangul",
  "/vocabulary",
  "/grammar",
  "/native",
  "/immersion",
  "/review",
  "/mistakes",
  "/quiz",
  "/settings",
  "/onboarding",
  ...lessons.map((lesson) => `/learn/${lesson.id}`),
  ...shortcutPaths,
  manifestPath,
  ...[...new Set(Object.values(visualAssets).flatMap((asset) => [asset.src, asset.source]))],
  ...manifestIconPaths,
  ...manifestImagePaths,
  ...speechSamplePaths
];

const imagePaths = paths.filter((path) => path.endsWith(".png") || path.endsWith(".webp"));
const audioPaths = paths.filter((path) => path.endsWith(".mp3"));
const htmlPaths = paths.filter((path) => !path.endsWith(".png") && !path.endsWith(".webp") && !path.endsWith(".mp3") && !path.endsWith(".js") && !path.endsWith(".webmanifest"));

for (const path of paths) {
  try {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) {
      failures.push(`${path}: ${response.status}`);
      continue;
    }
    if (path === manifestPath) {
      await validateManifest(manifest);
      continue;
    }
    if (path === "/") validateSecurityHeaders(response.headers);
    if (imagePaths.includes(path)) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
      if (path.endsWith(".png") && !isPng) failures.push(`${path}: expected PNG bytes`);
      if (path.endsWith(".webp") && !isWebp) failures.push(`${path}: expected WebP bytes`);
      continue;
    }
    if (audioPaths.includes(path)) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const hasId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
      const hasMpegFrame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
      if ((!hasId3 && !hasMpegFrame) || bytes.length <= 1024) failures.push(`${path}: expected non-empty MP3 bytes`);
      continue;
    }
    if (htmlPaths.includes(path)) {
      const html = await response.text();
      if (!html.includes("<html") || !html.includes("Kirina Korean") || html.includes("Yasashi Japanese")) {
        failures.push(`${path}: invalid HTML route`);
      }
      const title = html.match(/<title>(.*?)<\/title>/)?.[1];
      if (path in sitePages || path.startsWith('/learn/')) {
        if (!title) failures.push(`${path}: missing page title`);
        if (pageTitles.has(title) && pageTitles.get(title) !== path) failures.push(`${path}: duplicate title with ${pageTitles.get(title)}`);
        pageTitles.set(title, path);
        const origin=getSiteOrigin();
        if (origin && !privateRoutes.has(path)) {
          const canonical = html.match(/<link\b(?=[^>]*\brel="canonical")[^>]*\bhref="([^"]+)"/)?.[1];
          // Next may serialize the root URL without a trailing slash; compare URL identities.
          if (!canonical || new URL(canonical).href !== new URL(path, origin).href) failures.push(`${path}: missing or incorrect canonical`);
        }
        if(privateRoutes.has(path) && !/name="robots" content="noindex/.test(html)) failures.push(`${path}: missing noindex`);
      }
    }
  } catch (error) {
    failures.push(`${path}: ${error.cause?.code ?? error.message}`);
  }
}

for (const [path, marker] of [['/sitemap.xml','<urlset'], ['/robots.txt','User-Agent:']]) {
  const response=await fetch(`${baseUrl}${path}`);
  const body=await response.text();
  if(!response.ok || !body.includes(marker)) failures.push(`${path}: invalid discovery document`);
  if(body.includes('localhost')) failures.push(`${path}: leaked localhost URL`);
}

for (const path of removedOfflinePaths) {
  try {
    const response = await fetch(`${baseUrl}${path}`);
    if (response.status !== 404) failures.push(`${path}: expected removed route to return 404, got ${response.status}`);
  } catch (error) {
    failures.push(`${path}: ${error.cause?.code ?? error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`HTTP smoke passed for ${paths.length} routes.`);

function validateSecurityHeaders(headers) {
  const expected = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), geolocation=(), microphone=(self)"
  };
  for (const [name, value] of Object.entries(expected)) {
    if (headers.get(name) !== value) failures.push(`/: missing or incorrect ${name} header`);
  }
}

async function fetchJson(path) {
  try {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) {
      failures.push(`${path}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    failures.push(`${path}: ${error.cause?.code ?? error.message}`);
    return null;
  }
}

async function validateManifest(input) {
  if (!input?.name || !input?.start_url || !Array.isArray(input?.icons)) failures.push(`${manifestPath}: invalid manifest`);
  if (input?.name !== "Kirina Korean") failures.push(`${manifestPath}: wrong manifest name ${input?.name}`);
  if (input?.id !== "/") failures.push(`${manifestPath}: should declare a stable app id`);
  if (input?.lang !== "zh-CN") failures.push(`${manifestPath}: should declare zh-CN language`);
  if (input?.display !== "standalone") failures.push(`${manifestPath}: display should be standalone`);
  if (!Array.isArray(input?.display_override) || !input.display_override.includes("standalone")) failures.push(`${manifestPath}: display_override should keep standalone fallback`);
  if (input?.background_color !== "#f4f6f5") failures.push(`${manifestPath}: background color should match app shell`);
  if (!Array.isArray(input?.categories) || !input.categories.includes("education")) failures.push(`${manifestPath}: should declare education category`);

  const iconPurposes = new Set();
  for (const icon of input?.icons ?? []) {
    const dimensions = parseSquareSizes(icon.sizes);
    if (!icon.src?.startsWith("/assets/")) failures.push(`${manifestPath}: icon ${icon.src} should be local`);
    if (icon.type !== "image/png") failures.push(`${manifestPath}: icon ${icon.src} should be image/png`);
    if (!["any", "maskable"].includes(icon.purpose)) failures.push(`${manifestPath}: icon ${icon.src} has unsupported purpose ${icon.purpose}`);
    if (dimensions) {
      const bytes = await fetchBytes(icon.src);
      const actual = pngDimensions(bytes);
      if (!actual || actual.width !== dimensions.width || actual.height !== dimensions.height) {
        failures.push(`${manifestPath}: icon ${icon.src} declares ${icon.sizes} but file is ${actual ? `${actual.width}x${actual.height}` : "not PNG"}`);
      }
      iconPurposes.add(`${icon.purpose}:${dimensions.width}`);
    }
  }
  for (const required of ["any:192", "any:512", "maskable:192", "maskable:512"]) {
    if (!iconPurposes.has(required)) failures.push(`${manifestPath}: missing required icon ${required}`);
  }

  if (!Array.isArray(input?.shortcuts) || !input.shortcuts.length) failures.push(`${manifestPath}: should declare shortcuts`);
  for (const shortcut of input?.shortcuts ?? []) {
    if (!shortcut.name || !shortcut.url?.startsWith("/")) failures.push(`${manifestPath}: invalid shortcut ${shortcut.name ?? ""}`);
    if (shortcut.url && !shortcut.url.startsWith(input.scope ?? "/")) failures.push(`${manifestPath}: shortcut ${shortcut.url} outside scope`);
    if (!shortcut.description) failures.push(`${manifestPath}: shortcut ${shortcut.name} needs description`);
    for (const icon of shortcut.icons ?? []) {
      const dimensions = parseSquareSizes(icon.sizes);
      const bytes = await fetchBytes(icon.src);
      const actual = pngDimensions(bytes);
      if (!actual || !dimensions || actual.width !== dimensions.width || actual.height !== dimensions.height) {
        failures.push(`${manifestPath}: shortcut icon ${icon.src} size mismatch`);
      }
    }
  }

  if (!Array.isArray(input?.screenshots) || input.screenshots.length < 2) failures.push(`${manifestPath}: should declare install screenshots`);
  const screenshotFormFactors = new Set();
  for (const screenshot of input?.screenshots ?? []) {
    const dimensions = parseImageSizes(screenshot.sizes);
    if (!screenshot.src?.startsWith("/assets/screenshots/")) failures.push(`${manifestPath}: screenshot ${screenshot.src} should use captured application assets`);
    if (!["image/png", "image/webp"].includes(screenshot.type)) failures.push(`${manifestPath}: screenshot ${screenshot.src} has unsupported type ${screenshot.type}`);
    if (!["wide", "narrow"].includes(screenshot.form_factor)) failures.push(`${manifestPath}: screenshot ${screenshot.src} needs form_factor`);
    screenshotFormFactors.add(screenshot.form_factor);
    if (!screenshot.label) failures.push(`${manifestPath}: screenshot ${screenshot.src} needs a label`);
    if (screenshot.src && dimensions) {
      const bytes = await fetchBytes(screenshot.src);
      const actual = imageDimensions(bytes, screenshot.type);
      if (!actual || actual.width !== dimensions.width || actual.height !== dimensions.height) {
        failures.push(`${manifestPath}: screenshot ${screenshot.src} declares ${screenshot.sizes} but file is ${actual ? `${actual.width}x${actual.height}` : "unreadable"}`);
      }
    }
  }
  if (!screenshotFormFactors.has("wide") || !screenshotFormFactors.has("narrow")) failures.push(`${manifestPath}: should declare both wide and narrow install screenshots`);
}

function collectManifestIconPaths(input) {
  return [...new Set([
    ...(input?.icons ?? []).map((icon) => icon.src),
    ...(input?.shortcuts ?? []).flatMap((shortcut) => (shortcut.icons ?? []).map((icon) => icon.src))
  ].filter(Boolean))];
}

function collectManifestImagePaths(input) {
  return [...new Set((input?.screenshots ?? []).map((screenshot) => screenshot.src).filter(Boolean))];
}

function collectShortcutPaths(input) {
  return [...new Set((input?.shortcuts ?? []).map((shortcut) => shortcut.url).filter((url) => typeof url === "string" && url.startsWith("/")))];
}

async function fetchBytes(path) {
  try {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) {
      failures.push(`${path}: ${response.status}`);
      return new Uint8Array();
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    failures.push(`${path}: ${error.cause?.code ?? error.message}`);
    return new Uint8Array();
  }
}

function parseSquareSizes(value) {
  const match = String(value ?? "").match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function parseImageSizes(value) {
  const match = String(value ?? "").match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function imageDimensions(bytes, type) {
  if (type === "image/png") return pngDimensions(bytes);
  if (type === "image/webp") return webpDimensions(bytes);
  return null;
}

function pngDimensions(bytes) {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPng || bytes.length < 24) return null;
  return {
    width: (bytes[16] << 24) + (bytes[17] << 16) + (bytes[18] << 8) + bytes[19],
    height: (bytes[20] << 24) + (bytes[21] << 16) + (bytes[22] << 8) + bytes[23]
  };
}

function webpDimensions(bytes) {
  const isWebp =
    bytes.length >= 20 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (!isWebp) return null;

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const chunkSize = readUInt32LE(bytes, offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > bytes.length) return null;

    if (chunkType === "VP8X" && chunkSize >= 10) {
      return {
        width: readUInt24LE(bytes, dataOffset + 4) + 1,
        height: readUInt24LE(bytes, dataOffset + 7) + 1
      };
    }

    if (chunkType === "VP8L" && chunkSize >= 5 && bytes[dataOffset] === 0x2f) {
      const bits = readUInt32LE(bytes, dataOffset + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1
      };
    }

    if (chunkType === "VP8 " && chunkSize >= 10) {
      const hasStartCode = bytes[dataOffset + 3] === 0x9d && bytes[dataOffset + 4] === 0x01 && bytes[dataOffset + 5] === 0x2a;
      if (!hasStartCode) return null;
      return {
        width: readUInt16LE(bytes, dataOffset + 6) & 0x3fff,
        height: readUInt16LE(bytes, dataOffset + 8) & 0x3fff
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }
  return null;
}

function readUInt16LE(bytes, offset) {
  return bytes[offset] + (bytes[offset + 1] << 8);
}

function readUInt24LE(bytes, offset) {
  return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16);
}

function readUInt32LE(bytes, offset) {
  return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16) + (bytes[offset + 3] * 2 ** 24);
}
