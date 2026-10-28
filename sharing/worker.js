// Each creation is one KV value: its palette, theme choices and cropped images.
const MAX_BODY = 8 * 1024 * 1024;
const SHARE_LIFETIME_SECONDS = 14 * 24 * 60 * 60;
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
  return {
    version: 1,
    title: input.title.trim(),
    themes: input.themes,
    levels: input.levels,
    images: input.images,
    palette,
  };
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
