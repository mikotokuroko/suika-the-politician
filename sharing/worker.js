// Each creation is one KV value: its palette, theme choices and cropped images.
const MAX_BODY = 8 * 1024 * 1024;
const SHARE_LIFETIME_SECONDS = 14 * 24 * 60 * 60;
const GAME_URL = "https://mikotokuroko.github.io/suika-the-politician/";
const THEME_NAMES = { mywho: "Mywho", mbappe: "Mbappé", macron: "Macron" };
const COLOR_KEYS = [
  "bg",
  "ink",
  "red",
  "soft",
  "border",
  "button",
  "buttonText",
  "boardTop",
  "boardBottom",
  "ballBorder",
  "guide",
  "effect",
  "overlay",
  "focus",
];
const ID = /^[a-f0-9]{32}$/;
class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}
const fail = (status, code) => {
  throw new HttpError(status, code);
};
const hash = async (text) =>
  new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
  );
const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

async function boundedJson(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    fail(415, "invalid_type");
  if (Number(request.headers.get("content-length")) > MAX_BODY)
    fail(413, "too_large");
  if (!request.body) fail(400, "invalid_game");
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      fail(413, "too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    fail(400, "invalid_game");
  }
}

export function validateGame(input) {
  if (
    !input ||
    input.version !== 1 ||
    typeof input.title !== "string" ||
    input.title.trim().length < 1 ||
    input.title.length > 80
  )
    fail(400, "invalid_game");
  if (
    !Array.isArray(input.themes) ||
    input.themes.length > 3 ||
    new Set(input.themes).size !== input.themes.length ||
    input.themes.some((id) => !["mywho", "mbappe", "macron"].includes(id))
  )
    fail(400, "invalid_game");
  if (
    !Array.isArray(input.images) ||
    input.images.length > 15 ||
    input.images.length === 1 ||
    (!input.images.length && !input.themes.length)
  )
    fail(400, "invalid_game");
  if (input.levels !== input.images.length) fail(400, "invalid_game");
  const palette = {};
  for (const key of COLOR_KEYS) {
    const value = input.palette?.[key];
    if (typeof value !== "string" || !/^#[a-f0-9]{6}$/i.test(value))
      fail(400, "invalid_game");
    palette[key] = value;
  }
  for (const image of input.images) {
    if (
      typeof image !== "string" ||
      image.length > 700000 ||
      !/^data:image\/(png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
    )
      fail(400, "invalid_image");
    let binary;
    try {
      const start = image.indexOf(",") + 1;
      binary = atob(image.slice(start, start + 48));
    } catch {
      fail(400, "invalid_image");
    }
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const png = image.startsWith("data:image/png;");
    const validPng =
      bytes.length >= 33 &&
      view.getUint32(0) === 0x89504e47 &&
      view.getUint32(4) === 0x0d0a1a0a &&
      view.getUint32(12) === 0x49484452 &&
      view.getUint32(16) === 320 &&
      view.getUint32(20) === 320;
    // Canvas exports with transparent circle corners use the extended WebP header.
    const uint24 = (offset) =>
      bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
    const validWebp =
      bytes.length >= 30 &&
      view.getUint32(0) === 0x52494646 &&
      view.getUint32(8) === 0x57454250 &&
      view.getUint32(12) === 0x56503858 &&
      uint24(24) + 1 === 320 &&
      uint24(27) + 1 === 320;
    if (png ? !validPng : !validWebp) fail(400, "invalid_image");
  }
  if (input.preview !== undefined) {
    if (
      typeof input.preview !== "string" ||
      input.preview.length > 2000000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(input.preview)
    )
      fail(400, "invalid_preview");
    let bytes;
    try {
      bytes = Uint8Array.from(atob(input.preview.slice(22, 66)), (c) =>
        c.charCodeAt(0),
      );
    } catch {
      fail(400, "invalid_preview");
    }
    const view = new DataView(bytes.buffer);
    if (
      bytes.length < 33 ||
      view.getUint32(0) !== 0x89504e47 ||
      view.getUint32(4) !== 0x0d0a1a0a ||
      view.getUint32(12) !== 0x49484452 ||
      view.getUint32(16) !== 1200 ||
      view.getUint32(20) !== 630
    )
      fail(400, "invalid_preview");
  }
  return {
    version: 1,
    title: input.title.trim(),
    themes: input.themes,
    levels: input.levels,
    images: input.images,
    palette,
    ...(input.preview === undefined ? {} : { preview: input.preview }),
  };
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );

async function shareResponse(request, env, id, imageOnly, headers) {
  if (!["GET", "HEAD"].includes(request.method))
    fail(405, "method_not_allowed");
  const game = await env.GAMES.get(`games/${id}.json`, "json");
  if (!game || (game.expiresAt && game.expiresAt <= Date.now() / 1000)) {
    return new Response(
      request.method === "HEAD"
        ? null
        : "This shared game has expired or was deleted.",
      {
        status: 404,
        headers: {
          ...headers,
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex",
        },
      },
    );
  }
  const imageUrl = `${GAME_URL}preview.png`;
  const shareUrl = `${GAME_URL}?game=${id}`;
  if (imageOnly) {
    return new Response(null, {
      status: 302,
      headers: { ...headers, Location: imageUrl },
    });
  }
  const title = escapeHtml(game.title);
  const names = [
    ...(game.images.length ? ["Custom photos"] : []),
    ...game.themes.map((theme) => THEME_NAMES[theme]),
  ];
  const description = escapeHtml(
    `Play ${game.title}. Themes: ${names.join(", ")}.`,
  );
  const playUrl = `${GAME_URL}?game=${id}`;
  const nonce = crypto.randomUUID();
  const safeImageUrl = escapeHtml(imageUrl);
  const safeShareUrl = escapeHtml(shareUrl);
  const imageType = "image/png";
  const dimensions =
    '<meta property="og:image:width" content="1456"><meta property="og:image:height" content="730">';
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${description}">
<meta name="robots" content="noindex"><link rel="canonical" href="${safeShareUrl}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Suika the Politician">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
<meta property="og:url" content="${safeShareUrl}"><meta property="og:image" content="${safeImageUrl}">
<meta property="og:image:type" content="${imageType}">${dimensions}
<meta property="og:image:alt" content="Suika the Politician theme selection">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${safeImageUrl}">
<meta name="twitter:image:alt" content="Suika the Politician theme selection">
<style>body{margin:0;padding:24px;background:#171717;color:#fff;font:18px/1.5 system-ui;text-align:center}main{max-width:900px;margin:auto}img{max-width:100%;border-radius:16px}a{display:inline-block;padding:12px 24px;background:#fff;color:#171717;border-radius:12px}</style>
</head><body><main><h1>${title}</h1><img src="${safeImageUrl}" alt="Suika the Politician theme selection"><p><a href="${playUrl}">Play on GitHub Pages</a></p></main>
<script nonce="${nonce}">location.replace(${JSON.stringify(playUrl)});</script></body></html>`;
  return new Response(request.method === "HEAD" ? null : html, {
    headers: {
      ...headers,
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": `default-src 'none'; img-src 'self' https://mikotokuroko.github.io; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`,
      "X-Robots-Tag": "noindex",
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const headers = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin",
    };
    const json = (data, status = 200) =>
      Response.json(data, { status, headers });
    try {
      const share = new URL(request.url).pathname.match(
        /^\/share\/([a-f0-9]{32})(\/image)?$/,
      );
      if (share)
        return await shareResponse(request, env, share[1], !!share[2], headers);
      if (origin && origin !== env.ALLOWED_ORIGIN) fail(403, "origin_denied");
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers });
      const path = new URL(request.url).pathname;
      if (path === "/health" && request.method === "GET")
        return json({ ok: true });
      if (path === "/games" && request.method === "POST") {
        const ip = request.headers.get("CF-Connecting-IP") || "local";
        if (
          !(await env.CREATE_LIMIT.limit({ key: ip })).success ||
          !(await env.GLOBAL_LIMIT.limit({ key: "create" })).success
        )
          fail(429, "rate_limited");
        const game = validateGame(await boundedJson(request));
        game.expiresAt = Math.floor(Date.now() / 1000) + SHARE_LIFETIME_SECONDS;
        const id = crypto.randomUUID().replaceAll("-", "");
        const deleteToken = hex(crypto.getRandomValues(new Uint8Array(32)));
        await env.GAMES.put(`games/${id}.json`, JSON.stringify(game), {
          expiration: game.expiresAt,
          metadata: { deleteHash: hex(await hash(deleteToken)) },
        });
        return json({ id, deleteToken, expiresAt: game.expiresAt }, 201);
      }
      const match = path.match(/^\/games\/([a-f0-9]{32})$/);
      if (!match || !ID.test(match[1])) fail(404, "not_found");
      if (!["GET", "DELETE"].includes(request.method))
        fail(405, "method_not_allowed");
      const key = `games/${match[1]}.json`;
      if (request.method === "GET") {
        const object = await env.GAMES.get(key, "stream");
        if (!object) fail(404, "not_found");
        return new Response(object, {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      const object = await env.GAMES.getWithMetadata(key, "stream");
      if (!object.value) fail(404, "not_found");
      await object.value.cancel();
      const token =
        request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
      const expected = object.metadata?.deleteHash || "";
      const supplied = hex(await hash(token));
      if (
        !crypto.subtle.timingSafeEqual(
          await hash(supplied),
          await hash(expected),
        )
      )
        fail(403, "invalid_token");
      await env.GAMES.delete(key);
      return new Response(null, { status: 204, headers });
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      console.error(
        JSON.stringify({ event: "sharing_error", name: error.name }),
      );
      return json({ error: "server_error" }, 500);
    }
  },
};
