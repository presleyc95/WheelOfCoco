# What Coco Are You?

A slot machine that tells each designer which Coco they are today.
The same name always gets the same Coco for the whole day, and a new one tomorrow.

## Deploy to GitHub Pages

1. Create a new repo on GitHub and push `index.html` and `cocos.webp` to the `main` branch.
2. In the repo, go to **Settings → Pages**. Under **Build and deployment**, pick **Deploy from a branch**, then choose `main` / `(root)` and save.
3. After about a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Customizing

All Coco names, descriptions, odds, and face crops are in the `COCOS` array in `index.html`.
`crop` is `[x, y, size]`, a square in the 799×535 source image.
