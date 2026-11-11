# Carnet de Recettes (site)

GitHub Pages: Settings › Pages › Deploy from branch `main` / root.


- Mac zip: attach `Carnet-de-Recettes.zip` to a GitHub Release (latest).
- `appcast.xml`: Sparkle feed; installed apps still read the Google Drive feed until a release carries the new feed URL.
- Recipe links: `/r/?<recordName>` reads record type `SharedRecipe` from the app's CloudKit public database (`&dev` = Development); tokens in `r/index.html`. Older `/r/#z.<base64url raw-deflate JSON>` links still work.
