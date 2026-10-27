# 合成大迈乎

A static canvas merge game. No build step or dependencies are required.

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

Built-in image order is explicit in `scripts/themes.js`; edit that list to change the progression. Radii adapt to the number of levels. Scores remain stored
under the `xigua_best` local storage key. GoatCounter tracks page views and game-over
events.

## Deploy

Publish the entire repository as a static site, keeping the directory structure.
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

Images are processed locally and retained only for the current page session. Reloading
clears custom photos. Returning to theme selection preserves them; selecting a theme
starts a new game. Uploads are downscaled to a maximum dimension of 1600 pixels, and
game sprites are 320-pixel circles. Use browser-supported image formats such as PNG,
JPEG, or WebP.

## Languages and portrait framing

The first visit uses the first supported browser language (Chinese, French, or
English), falling back to English. The theme screen and game toolbar let users
choose a language; that saved choice takes precedence on later visits. UI translations live in
`scripts/i18n.js`.

Built-in face framing is stored alongside image paths in `scripts/themes.js` as
normalized face centers (`cx`, `cy`) and zoom. Originals are unchanged. The same
crops are used for theme thumbnails and game sprites. Zooming out adds a dark red
background where a source image does not cover the circle. Custom crops also allow
zooming out to keep a whole head in view. Missing image entries are excluded.
