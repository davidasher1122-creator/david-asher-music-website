# David Asher Music

Interactive rebuild of the Wix site:

**https://davidasher1122.wixsite.com/david-asher-music**

Craft/motion inspired by **https://remix.run/**

## Structure (matches Wix)

| Section | Anchor |
|---------|--------|
| Hero | `#top` |
| About / BIO | `#about` |
| Portfolio | `#portfolio` |
| Sign up | `#signup` |

Single page: `index.html`

## Preview

```bash
cd ~/david-asher-music
python3 -m http.server 5173
```

Open http://localhost:5173

## Customize

1. Set your real email on `#inquiry-form` → `data-email`
2. **Spotify / Apple Music:** On each album card in `index.html`, find the `track__stream` links. Replace `href="#"` and remove the `is-empty` class, e.g.  
   `<a href="https://open.spotify.com/album/..." data-service="spotify">Spotify</a>`
3. Bandcamp links are already live from your catalog
