# Dayline
A daily 3D time-trial racing game. Everyone drives the same track each day.

The game is hosted here on GitHub Pages. The shared leaderboard, ghosts and accounts run on a free Supabase project
(see the `dayline-supabase` package for setup).

To connect it, set `apiBase` in `config.js` to `https://YOUR-PROJECT-REF.supabase.co/functions/v1`.
Without it the game still works, with progress saved in each player's browser only.
