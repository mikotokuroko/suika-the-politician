# 合成大仇人

![Suika the Politician theme selection](preview.png)

## Run locally

From the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The region check uses external services and requires
network access. It retains the original restriction for mainland China and blocks
access when location cannot be determined.

## Structure

- `index.html`: semantic page structure, score display, and controls.
- `styles/game.css`: page layout, controls, game-over panel, and region notice.
- `scripts/region-check.js`: location lookup and access restriction.
- `scripts/game.js`: image loading, audio, physics, rendering, and input handling.
- `assets/images/`: original, Mbappé, and Macron theme images.
- `scripts/themes.js`: built-in theme names and image order.
- `scripts/theme-picker.js`: theme selection, local photo upload, and circular cropping.
- `scripts/palette.js`: shared color settings for the interface and game canvas.
- `scripts/game-preview.js`: live color previews.
- `scripts/sharing.js`: creation, public game links, and private deletion links.
- `sharing/worker.js`: Cloudflare Workers API with KV storage.

Built-in image order is explicit in `scripts/themes.js`; edit that list to change the progression. Radii adapt to the number of levels. Scores remain stored
under the `xigua_best` local storage key. Cloudflare Web Analytics measures visits,
page views, and loading performance without cookies or tracking individual visitors.
The site remains hosted on GitHub Pages. Analytics are available in the owner's
Cloudflare dashboard under **Web Analytics → mikotokuroko.github.io**; filter by
the `/suika-the-politician/` path to view this game.

## Deploy

Push `main` to deploy the static site on GitHub Pages, keeping the directory structure.
The page now requires its `styles`, `scripts`, and `assets` directories; uploading
only `index.html` is insufficient.

## Controls

Drag or move the pointer to aim and release to drop. The left and right arrow keys
also aim; Space or the down arrow drops. Use the sound button to toggle effects and
the restart button to start a new game.

## Custom themes

Choose the custom theme option, enter 2–15 levels (default 10), and add one image
per level, up to 15 photos total. Photos are center-cropped into circles automatically.
Use the crop controls to adjust zoom and horizontal/vertical position; reorder or
remove photos before starting. Adding more files appends them to the current set.
The start button enables only when the photo count matches the level count.

Unshared images are processed locally and retained only for the current page session. Reloading
clears the draft. Returning to theme selection preserves it; selecting a theme
starts a new game. Uploads are downscaled to a maximum dimension of 1600 pixels, and
game sprites are 320-pixel circles. Use browser-supported image formats such as PNG,
JPEG, or WebP.

## Shared games

Choose **Save and share** to upload only the 320-pixel circular crops and save the
game name, level order, selected default themes, and 14 color settings. Crops use
compressed WebP (PNG fallback) to conserve the free storage allowance. Originals
are not uploaded. Uncheck all default themes for a custom-photos-only game, or
share selected default themes with a palette even without uploading photos.

Share links use `https://mikotokuroko.github.io/suika-the-politician/?game=<ID>`.
All links use the standard `preview.png` theme-selection image for social previews.
Older Cloudflare `/share/<ID>` links remain playable and use the same standard
preview; their image endpoint redirects to `preview.png`. Messaging apps may
retain cached cards for previously shared links.

Anyone with a share link can
view its photos and play. Each save creates a separate snapshot; editing your draft
does not change an earlier link. Keep the separate private deletion link: there is
no account or password recovery for it. Opening that link does not delete anything;
the creator must use the delete button and confirm. Deletion cannot retract photos
someone has already downloaded.

The color editor has a live preview of theme selection, the game board, and the
game-over screen. It updates with photos, theme checkboxes, title, and color changes.

The backend uses **Cloudflare Workers Free and Workers KV**, with no R2 subscription.
Each creation is a single KV value with a hashed deletion token in private metadata.
Older records with an optional `preview` PNG remain valid and expire/delete as
before, but that image is no longer used. New saves do not upload a social card.
Social platforms may retain their own image caches after deletion.
Photos are bounded to 15, uploads to 8 MiB, and requests are rate-limited. KV is
eventually consistent: new links and deletions can take about a minute or longer
to propagate between regions. Shared games and their uploaded photos automatically
expire 14 days after saving. Cloudflare KV deletes the entire record at expiry,
freeing its storage without a scheduled job. The save result and shared-game screen
show the server-assigned expiry date in the viewer's local time zone and language.
Opening or playing a game does not extend its expiry. Free storage and request quotas apply;
when exhausted, sharing operations fail instead of automatically upgrading the plan.
See [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/).

### Backend development and deployment

```sh
npm ci
npm test
npm run dev:sharing
```

Serve the frontend on `http://localhost:8080` and temporarily set `SHARING_API` in
`scripts/sharing-config.js` to `http://localhost:8787` for local development.
Local Wrangler uses simulated KV, not production data. Restore the production API
URL before pushing. To deploy backend changes to the configured Cloudflare account:

```sh
npm run deploy:sharing
```

The namespace ID and allowed frontend origin are in `sharing/wrangler.jsonc`.
Keep credentials out of browser code and Git. GitHub Pages excludes the backend,
dependencies, and tests using `_config.yml`. Backend changes require a separate
Worker deployment; pushing to GitHub only deploys the frontend.

## Languages and portrait framing

The first visit uses the first supported browser language (Chinese, French, or
English), falling back to English. A manually selected language is remembered locally. UI translations live in
`scripts/i18n.js`.

Built-in face framing is stored alongside image paths in `scripts/themes.js` as
normalized face centers (`cx`, `cy`) and zoom. Originals are unchanged. The same
crops are used for theme thumbnails and game sprites. Zooming out adds a dark red
background where a source image does not cover the circle. Custom crops also allow
zooming out to keep a whole head in view. Missing image entries are excluded.

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
