# Dayline
A daily 3D time-trial racing game. Everyone drives the same track each day.

The game is hosted here on GitHub Pages. The shared leaderboard, ghosts and Google accounts run on a small Cloudflare Worker.

## Connect the leaderboard
1. Deploy the Cloudflare package and note your Worker address (e.g. `https://dayline.yourname.workers.dev`).
2. In the Worker's `wrangler.toml` set `ALLOWED_ORIGINS = "https://dayline-game.github.io"` and run `npm run deploy` again.
3. Edit `config.js` in this repo and set `apiBase` to your Worker address. Commit. The site updates in about a minute.
4. For Google sign-in, add `https://dayline-game.github.io` to Authorized JavaScript origins in Google Cloud Console.

Without step 3 the game still works, with progress saved in each player's browser only.
