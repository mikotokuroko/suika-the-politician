# 合成不可说 · Suika the Politician

A Suika-style physics game: drop matching faces, merge them, and build your own
photo theme to share with friends.

**[Play in your browser](https://mikotokuroko.github.io/suika-the-politician/)**

![Suika the Politician cover photo](preview.png)

## Play and customize

- Choose Mywho, Mbappé, or Macron, or upload your own photos.
- Create 2–15 levels (default 10), with one photo per level. Adjust the circular
  crops and image order before playing.
- Customize the colors with a live preview of the menu, board, and game-over screen.
- Play in Chinese, English, or French. The language follows your browser unless
  you choose another.

Move or drag to aim, then release to drop. On a keyboard, use **← / →** to aim and
**Space / ↓** to drop.

## Share a game

Choose **Save and share** to create a link with your photos, colors, and selected
themes. You can exclude all built-in themes for a game using only your photos.
Only the cropped images are uploaded; unsaved drafts stay in the current browser
session and are cleared on reload.

> [!NOTE]
> Anyone with the link can view the photos and play. Shared games expire and are
> automatically deleted after **14 days**. Keep the private deletion link if you
> want to remove yours earlier. Editing a draft does not change an existing share.

## Run locally

From the repository root, with Python 3 installed:

```sh
python3 -m http.server 8080
```

Open [localhost:8080](http://localhost:8080). No frontend build is required.
The region check needs an internet connection; access is blocked in mainland
China or when the location cannot be determined.

### Sharing backend

Sharing uses Cloudflare Workers and KV. With Node.js and npm installed:

```sh
npm ci
npm test
npm run dev:sharing
```

For local sharing, set `SHARING_API` in [scripts/sharing-config.js](scripts/sharing-config.js)
to `http://localhost:8787`. Wrangler uses local KV for development. Restore the
production URL before publishing.

Push `main` to deploy this site's frontend on GitHub Pages. Deploy backend changes
separately with `npm run deploy:sharing`. For your own deployment, configure your
Cloudflare account, KV namespace, and allowed origin in
[sharing/wrangler.jsonc](sharing/wrangler.jsonc).

## Disclaimer

I do not own the photos, portraits, memes, or other third-party images included in
this project. All rights belong to their respective creators and rights holders.
These images are used for entertainment and parody; their inclusion does not imply
endorsement by or affiliation with the people depicted or the rights holders.

This repository does not grant permission or a license to reuse third-party images.
If you upload custom photos, use images you own or have permission to use. If you are
a rights holder and would like an image credited or removed, please open an issue
in this repository so it can be addressed.

This project was originally forked from another GitHub user's work. To protect
their safety amid concerns about local laws, I have chosen not to identify or tag
them in this repository.
