'use strict';

const { toQR } = require('toqr');
const { isIP } = require('node:net');

function normalizeExpoUrls({ tunnelUrl = '', lanUrl = '', webUrl = '' } = {}) {
  return {
    tunnelUrl: String(tunnelUrl).trim(),
    lanUrl: String(lanUrl).trim(),
    webUrl: String(webUrl).trim(),
  };
}

function readLastOption(args, name) {
  const prefix = `--${name}=`;
  let value = '';
  for (let index = 0; index < args.length; index += 1) {
    if (args[index].startsWith(prefix)) value = args[index].slice(prefix.length);
    else if (args[index] === `--${name}`) {
      value = args[index + 1] && !args[index + 1].startsWith('--') ? args[++index] : '';
    }
  }
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function resolvePhoneHandoffUrls(options, fetchImpl = fetch) {
  const urls = normalizeExpoUrls(options);
  if (urls.tunnelUrl || urls.lanUrl) return urls;

  try {
    const response = await fetchImpl('http://127.0.0.1:8085/_expo/link?choice=expo-go&platform=ios', {
      headers: { 'expo-platform': 'ios' },
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 307) throw new Error('Expo Go redirect unavailable.');
    const url = new URL(response.headers.get('location'));
    const hostname = url.hostname;
    if (!['exp:', 'exps:'].includes(url.protocol) || !hostname
      || ['localhost', '0.0.0.0', '[::1]', '[::]'].includes(hostname)
      || hostname.endsWith('.localhost') || hostname.startsWith('127.')) {
      throw new Error('Expo did not return an address reachable by phone.');
    }
    if (isIP(hostname.replace(/^\[|\]$/g, '')) || hostname.endsWith('.local')) urls.lanUrl = url.href;
    else urls.tunnelUrl = url.href;
    return urls;
  } catch (cause) {
    throw new Error('Start npm run phone:preview, wait for READY TO SCAN, then run npm run phone:handoff again.', { cause });
  }
}

function buildQrUrl(value) {
  const modules = toQR(value);
  const side = Math.sqrt(modules.length);
  const margin = 4;
  const size = side + 2 * margin;
  const squares = [];
  for (let index = 0; index < modules.length; index += 1) {
    if (!modules[index]) continue;
    const x = margin + index % side;
    const y = margin + Math.floor(index / side);
    squares.push(`M${x} ${y}h1v1h-1z`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><path d="${squares.join('')}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function buildExpoPhoneHandoffHtml({ tunnelUrl, lanUrl, webUrl, generatedAt = new Date().toISOString() } = {}) {
  const urls = normalizeExpoUrls({ tunnelUrl, lanUrl, webUrl });
  const primaryUrl = urls.lanUrl || urls.tunnelUrl;
  const usesLan = Boolean(urls.lanUrl);
  if (!primaryUrl) {
    throw new Error('Supply the current Expo URL: npm run phone:handoff -- --lan-url=exp://YOUR_MAC_IP:PORT (or --tunnel-url=exp://CURRENT_TUNNEL).');
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Open Diaspora in Expo Go</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #10211a;
      --muted: #5d6b63;
      --leaf: #1f7a4d;
      --sun: #f8c44f;
      --paper: #fffaf0;
      --card: #ffffff;
    }
    body {
      align-items: center;
      background:
        radial-gradient(circle at top left, rgba(248, 196, 79, 0.35), transparent 34rem),
        linear-gradient(135deg, #fdf6df 0%, #d9f0df 100%);
      color: var(--ink);
      display: flex;
      font-family: Avenir Next, Nunito, Helvetica, Arial, sans-serif;
      justify-content: center;
      margin: 0;
      min-height: 100vh;
      padding: 24px;
    }
    main {
      background: var(--card);
      border: 1px solid rgba(16, 33, 26, 0.12);
      border-radius: 32px;
      box-shadow: 0 24px 80px rgba(16, 33, 26, 0.18);
      max-width: 560px;
      padding: 28px;
      text-align: center;
      width: 100%;
    }
    h1 {
      font-size: clamp(30px, 7vw, 48px);
      line-height: 0.98;
      margin: 0 0 12px;
    }
    p {
      color: var(--muted);
      font-size: 17px;
      line-height: 1.45;
      margin: 0 auto 22px;
      max-width: 38ch;
    }
    img {
      background: var(--paper);
      border: 12px solid var(--paper);
      border-radius: 26px;
      height: min(72vw, 320px);
      width: min(72vw, 320px);
    }
    a {
      color: inherit;
    }
    .button {
      background: var(--leaf);
      border-radius: 999px;
      color: white;
      display: block;
      font-weight: 800;
      margin: 18px auto 10px;
      max-width: 360px;
      padding: 16px 20px;
      text-decoration: none;
    }
    .backup {
      display: grid;
      gap: 10px;
      margin-top: 18px;
    }
    .backup a {
      background: var(--paper);
      border-radius: 18px;
      color: var(--ink);
      overflow-wrap: anywhere;
      padding: 12px;
      text-decoration: none;
    }
    small {
      color: var(--muted);
      display: block;
      margin-top: 18px;
    }
  </style>
</head>
<body>
  <main>
    <h1>Open Diaspora in Expo Go</h1>
    <p>Scan this with your iPhone camera, or open this page on your phone and tap the green button.</p>
    ${usesLan ? '<p>Keep your iPhone and Mac on the same Wi-Fi network.</p>' : ''}
    <img alt="QR code for ${escapeHtml(primaryUrl)}" src="${escapeHtml(buildQrUrl(primaryUrl))}">
    <a class="button" href="${escapeHtml(primaryUrl)}">${usesLan ? 'Open Expo Go on Wi-Fi' : 'Open Expo Go tunnel'}</a>
    <div class="backup">
      ${usesLan && urls.tunnelUrl ? `<a href="${escapeHtml(urls.tunnelUrl)}">Tunnel fallback: ${escapeHtml(urls.tunnelUrl)}</a>` : ''}
      ${urls.webUrl ? `<a href="${escapeHtml(urls.webUrl)}">Mac web preview: ${escapeHtml(urls.webUrl)}</a>` : ''}
    </div>
    <small>Generated ${escapeHtml(generatedAt)}</small>
  </main>
</body>
</html>
`;
}

module.exports = {
  buildExpoPhoneHandoffHtml,
  normalizeExpoUrls,
  resolvePhoneHandoffUrls,
  readLastOption,
};
