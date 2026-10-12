# What Coco Are You?

A slot machine for finding out which Coco you are.

- **Coco Coins:** each spin costs 1 coin. Each spin has a 10% chance of landing a Coco, and every Coco landed goes into your collection. There's no daily limit.
- **Shop:** earn coins by solving algebra. Bigger bags mean harder problems: 1 coin (one-step), 5 (two-step), 10 (variables on both sides), 25 (distribution), 50 (systems of equations), 100 (quadratics).
- **Daily boosts:** spend coins on Lucky Charm (20% chance for 5 spins), Elder's Blessing (30% for 10 spins) or Mystic's Guarantee (next spin is a sure Coco). Each one can be bought once per day.
- **Daily tribute:** type "Colton is the coolest boss ever" for 2 free coins a day. Anyone can skip it. Saying something mean instead wipes your coins and curses the site until midnight.
- **Atonement:** a cursed player can lift the curse early by writing at least 50 words (25 of them different) about how cool Colton is, with no negativity. Lost coins don't come back.
- **Name lock:** your name is set permanently the first time you spin.
- **Stats:** lifetime spins, hit rate, longest drought, coins earned, spent and lost, and more.

Progress is saved in each person's own browser.

## Wiping everyone's progress

Save data is stored under keys starting with `coco-v2-`. To give everyone a fresh start in a future release, change that prefix in `index.html` (for example to `coco-v3-`) and add the old key names to the cleanup line just below it.

## Deploy to GitHub Pages

1. Create a new repo on GitHub and push `index.html` and `cocos.webp` to the `main` branch.
2. In the repo, go to **Settings → Pages**. Under **Build and deployment**, pick **Deploy from a branch**, then choose `main` / `(root)` and save.
3. After about a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Customizing

Near the top of the script in `index.html`:

- `COCOS`: names, descriptions, odds (`weight`) and face crops (`crop` is `[x, y, size]` in the 799×535 image).
- `COCO_CHANCE`, `SPIN_COST`, `DAILY_TRIBUTE`: the base odds and prices.
- `PACKS` and `BOOSTS`: the shop's coin bags and boosts.
- `MEAN`: the words that anger the Cocos.
