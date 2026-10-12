# What Coco Are You?

A slot machine for finding out which Coco you are, with an admin dashboard.

- **Coco Coins:** each spin costs 1 coin. Each spin has a 5% chance of landing a Coco, and every Coco landed goes into your collection.
- **Shop:** earn coins by playing mini-games: **Whack-a-Coco** (tap Cocos for 25 seconds, avoid Shadow Coco; up to 15 coins), **Coco Memory** (match six pairs within a minute; up to 5 coins) and **Stop the Reel** (stop a speeding reel on the target Coco; up to 25 coins). Better play earns more. These can't be solved by pasting into an AI.
- **Daily vault:** anyone can earn at most 150 coins a day (mini-games and tribute combined). It refills at midnight Central time. The database rules enforce this, along with a 20-second minimum between earnings, so even a player who edits the game code or scripts the games can't give themselves more.
- **Daily boosts:** Lucky Charm (10% for 5 spins), Elder's Blessing (15% for 10 spins), Mystic's Guarantee (next spin is a sure Coco). Each can be bought once per day.
- **Daily tribute:** type "Colton is the coolest boss ever" for 2 free coins a day. Saying something mean wipes your coins and curses your game until midnight.
- **Atonement:** write 50+ words (25+ different) about how cool Colton is, with no negativity, to lift the curse early.
- **Name lock:** names are unique and permanent. Only the admin can rename someone.
- **Stats:** lifetime spins, hit rate, longest drought, coins earned, spent and lost, and more.
- **Social:** a live "X players online" count, a player list with everyone's collections, profiles, friend requests, a leaderboard (Cocos found, collection, Shadow Cocos, richest, most spins, longest drought) for everyone or just friends, and a live activity feed.
- **Admin dashboard** (`admin.html`): see who's online, everyone's coins, collections and stats; edit any of it; rename, reset or delete players; give everyone coins.

## Files

| File | What it is |
|---|---|
| `index.html` | The game |
| `admin.html` | The admin dashboard |
| `cocos.js` | Coco list, odds and shared helpers |
| `store.js` | Saves data to Firebase (or local test mode) |
| `firebase-config.js` | Your Firebase project settings |
| `database.rules.json` | Security rules to paste into Firebase (generated) |
| `tools/make_rules.py` | Generates `database.rules.json` |
| `cocos.webp` | The picture |

Until `firebase-config.js` is filled in, the site runs in **local test mode**: progress stays in each browser, and the dashboard (password `admin`) only sees players from that same browser. To pretend to be several players while testing, open the game with `?as=alice`, `?as=bob`, and so on.

## Firebase setup (about 10 minutes, free)

1. Go to <https://console.firebase.google.com>, click **Create a project**, and name it (for example `what-coco`). You can turn off Google Analytics.
2. **Turn on sign-in:** go to **Build → Authentication → Get started**. Under **Sign-in method**, enable **Anonymous** and **Email/Password**. Then on the **Users** tab, click **Add user** and create your admin login (your email and a password).
3. **Create the database:** go to **Build → Realtime Database → Create database**, pick a location, and choose **Start in locked mode**. Open the **Rules** tab, replace everything with the contents of `database.rules.json`, and click **Publish**. (The file is long; that's expected.)
4. **Get your settings:** click the gear icon, then **Project settings**. Under **Your apps**, click the **</>** (Web) button, register an app (no hosting needed), and copy the `firebaseConfig` values into `firebase-config.js`. Make sure `databaseURL` is filled in.
5. **Allow your site:** in **Authentication → Settings → Authorized domains**, add `<your-github-username>.github.io`.
6. Push all the files to GitHub (see below).
7. **Make yourself the admin:** open `https://<your-username>.github.io/<repo>/admin.html` and sign in. It will say "Not an admin yet" and show your user ID. In Firebase, go to **Realtime Database → Data**, hover over the top row, click **+**, and add a key named `admins`. Inside it, add a child whose key is your user ID and whose value is `true`. Refresh the dashboard.

The values in `firebase-config.js` are safe to publish. Firebase web keys aren't secret; the security rules control who can read and change what.

## Deploy to GitHub Pages

1. Create a repo on GitHub and push all the files above to the `main` branch.
2. In the repo, go to **Settings → Pages**. Under **Build and deployment**, pick **Deploy from a branch**, choose `main` / `(root)`, and save.
3. After about a minute the game is live at `https://<your-username>.github.io/<repo-name>/`, and the dashboard is at `.../admin.html`.

## Customizing

- `cocos.js`: names, descriptions, odds (`weight`) and face crops (`crop` is `[x, y, size]` in the 799×535 image).
- Near the top of the script in `index.html`: `COCO_CHANCE`, `SPIN_COST`, `DAILY_TRIBUTE`, `GAMES` (each game's `max` payout), `WHACK_SECONDS`, `BOOSTS`, and `MEAN` (the words that anger the Cocos).

## Changing the daily vault

The 150-coin limit and the 20-second gap (`EARN_GAP` / `EARN_GAP_MS`) each live in two places: `DAILY_CAP` in `cocos.js` and `DAILY_CAP` in `tools/make_rules.py`. Change both, run `python tools/make_rules.py`, and paste the new `database.rules.json` into Firebase.

## What the rules stop (and what they can't)

The database rejects: earning more than the daily vault, rewinding or deleting the vault, gaining a Coco without spending a coin, more than one new Coco per spin, faking spin counts, changing your own name, faking a public profile that doesn't match your real record, editing anyone else's data, and posting feed items under someone else's name.

What a determined cheater can still do: their browser rolls the dice, so they could make every paid spin a win. That's capped by the vault, so at most 150 guaranteed Cocos a day, and it would stand out on the dashboard. Fully cheat-proof spins would need server code (Firebase Cloud Functions, which requires the pay-as-you-go plan).
