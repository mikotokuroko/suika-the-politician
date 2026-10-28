import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
const origin = "https://mikotokuroko.github.io";
const mf = new Miniflare(
  convertV4MiniflareOptions({
    name: "test",
    modules: true,
    scriptPath: "sharing/worker.js",
    compatibilityDate: "2026-10-28",
    kvNamespaces: ["GAMES"],
    bindings: { ALLOWED_ORIGIN: origin },
    ratelimits: {
      CREATE_LIMIT: { namespace_id: "1", simple: { limit: 100, period: 60 } },
      GLOBAL_LIMIT: { namespace_id: "2", simple: { limit: 100, period: 60 } },
    },
  }),
);
after(() => mf.dispose());
const fixtures = JSON.parse(
  await readFile(new URL("fixtures/circle.json", import.meta.url), "utf8"),
);
const palette = Object.fromEntries(
  [
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
  ].map((k) => [k, "#123456"]),
);
const game = {
  version: 1,
  title: "Friends",
  levels: 0,
  images: [],
  themes: ["mbappe"],
  palette,
};
const send = (path, method = "GET", body, extra = {}) =>
  mf.dispatchFetch("https://test.local" + path, {
    method,
    headers: { Origin: origin, "Content-Type": "application/json", ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

test("save, retrieve exact theme/palette, protect deletion and remove", async () => {
  const response = await send("/games", "POST", game);
  assert.equal(response.status, 201);
  const saved = await response.json();
  assert.match(saved.id, /^[a-f0-9]{32}$/);
  assert.match(saved.deleteToken, /^[a-f0-9]{64}$/);
  const loaded = await send("/games/" + saved.id);
  assert.deepEqual(await loaded.json(), {
    ...game,
    expiresAt: saved.expiresAt,
  });
  assert.equal(
    (
      await send("/games/" + saved.id, "DELETE", undefined, {
        Authorization: "Bearer wrong",
      })
    ).status,
    403,
  );
  assert.equal((await send("/games/" + saved.id)).status, 200);
  assert.equal(
    (
      await send("/games/" + saved.id, "DELETE", undefined, {
        Authorization: "Bearer " + saved.deleteToken,
      })
    ).status,
    204,
  );
  assert.equal((await send("/games/" + saved.id)).status, 404);
});
test("15 cropped images round-trip in PNG and WebP; wrong dimensions fail", async () => {
  for (const image of Object.values(fixtures)) {
    const snapshot = {
      ...game,
      themes: [],
      levels: 15,
      images: Array(15).fill(image),
    };
    const response = await send("/games", "POST", snapshot);
    assert.equal(response.status, 201);
    const { id, expiresAt } = await response.json();
    assert.deepEqual(await (await send("/games/" + id)).json(), {
      ...snapshot,
      expiresAt,
    });
  }
  const bad = Buffer.from(fixtures.png.split(",")[1], "base64");
  bad.writeUInt32BE(10000, 16);
  const oversized = "data:image/png;base64," + bad.toString("base64");
  assert.equal(
    (
      await send("/games", "POST", {
        ...game,
        levels: 2,
        images: [oversized, oversized],
      })
    ).status,
    400,
  );
});

test("server assigns a fixed 14-day KV expiration that reads cannot extend", async () => {
  const before = Math.floor(Date.now() / 1000);
  const response = await send("/games", "POST", {
    ...game,
    expiresAt: 9999999999,
  });
  const saved = await response.json();
  const after = Math.floor(Date.now() / 1000);
  assert.ok(saved.expiresAt >= before + 14 * 86400);
  assert.ok(saved.expiresAt <= after + 14 * 86400);
  const namespace = await mf.getKVNamespace("GAMES");
  const list = await namespace.list({ prefix: `games/${saved.id}` });
  assert.equal(list.keys[0].expiration, saved.expiresAt);
  assert.ok(list.keys[0].metadata.deleteHash);
  const loaded = await (await send("/games/" + saved.id)).json();
  assert.equal(loaded.expiresAt, saved.expiresAt);
  assert.equal(
    (await namespace.list({ prefix: `games/${saved.id}` })).keys[0].expiration,
    saved.expiresAt,
  );
});

test("reject invalid palettes, theme IDs, counts, images, and empty creations", async () => {
  for (const invalid of [
    { ...game, palette: { ...palette, bg: "url(x)" } },
    { ...game, themes: ["unknown"] },
    { ...game, themes: [] },
    { ...game, levels: 2 },
    { ...game, levels: 1, images: ["x"] },
    { ...game, levels: 16, images: Array(16).fill("x") },
    {
      ...game,
      levels: 2,
      images: [
        "data:image/svg+xml;base64,PHN2Zz4=",
        "data:image/svg+xml;base64,PHN2Zz4=",
      ],
    },
    { ...game, title: "" },
  ])
    assert.equal((await send("/games", "POST", invalid)).status, 400);
});
test("CORS, unknown IDs, wrong methods and request-size limit", async () => {
  assert.equal(
    (await send("/games", "POST", game, { Origin: "https://other.example" }))
      .status,
    403,
  );
  const options = await send("/games", "OPTIONS");
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("access-control-allow-origin"), origin);
  assert.equal((await send("/games/not-an-id")).status, 404);
  assert.equal((await send("/games/" + "0".repeat(32), "PUT")).status, 405);
  const large = await send("/games", "POST", {
    ...game,
    title: "x".repeat(8 * 1024 * 1024),
  });
  assert.equal(large.status, 413);
});
test("rate limit returns a retryable error", async () => {
  const limited = new Miniflare(
    convertV4MiniflareOptions({
      name: "limited",
      modules: true,
      scriptPath: "sharing/worker.js",
      compatibilityDate: "2026-10-28",
      kvNamespaces: ["GAMES"],
      bindings: { ALLOWED_ORIGIN: origin },
      ratelimits: {
        CREATE_LIMIT: { namespace_id: "3", simple: { limit: 1, period: 60 } },
        GLOBAL_LIMIT: { namespace_id: "4", simple: { limit: 1, period: 60 } },
      },
    }),
  );
  try {
    const options = {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(game),
    };
    assert.equal(
      (await limited.dispatchFetch("https://test.local/games", options)).status,
      201,
    );
    assert.equal(
      (await limited.dispatchFetch("https://test.local/games", options)).status,
      429,
    );
  } finally {
    await limited.dispose();
  }
});
