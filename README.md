# Carnet de Recettes (site)

GitHub Pages: Settings › Pages › Deploy from branch `main` / root.

- `releases.json`: version and notes shown on /telecharger.
- Mac zip: attach `Carnet-de-Recettes.zip` to a GitHub Release (latest).
- `appcast.xml`: Sparkle feed; installed apps still read the Google Drive feed until a release carries the new feed URL.
- Recipe links: `/r/#<payload>`, payload = base64url of JSON `{t,img,time,por,ing[],steps[]}`; prefix `z.` when deflate-raw compressed.
