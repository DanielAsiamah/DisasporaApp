'use strict';

function normalizeExpoUrls({ tunnelUrl = '', lanUrl = '', webUrl = '' } = {}) {
  return {
    tunnelUrl: String(tunnelUrl).trim(),
    lanUrl: String(lanUrl).trim(),
    webUrl: String(webUrl).trim(),
  };
}

function readLastOption(args, name) {
  const prefix = `--${name}=`;
  const matches = args.filter((arg) => arg.startsWith(prefix));
  return matches.length > 0 ? matches[matches.length - 1].slice(prefix.length) : '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildQrUrl(value) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(value)}`;
}

function buildExpoPhoneHandoffHtml({ tunnelUrl, lanUrl, webUrl, generatedAt = new Date().toISOString() } = {}) {
  const urls = normalizeExpoUrls({ tunnelUrl, lanUrl, webUrl });
  const primaryUrl = urls.tunnelUrl || urls.lanUrl;
  if (!primaryUrl) {
    throw new Error('A tunnel or LAN Expo URL is required.');
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
    <img alt="QR code for ${escapeHtml(primaryUrl)}" src="${escapeHtml(buildQrUrl(primaryUrl))}">
    <a class="button" href="${escapeHtml(primaryUrl)}">Open Expo Go tunnel</a>
    <div class="backup">
      ${urls.lanUrl ? `<a href="${escapeHtml(urls.lanUrl)}">LAN backup: ${escapeHtml(urls.lanUrl)}</a>` : ''}
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
  readLastOption,
};
