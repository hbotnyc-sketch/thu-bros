# Thursday Bros

A one-page web app for our weekly Thursday sohbet: **Hadis**, **Konu** (volunteer topic) and **Host & food**, all in one place.

## How it works

| When | What happens |
|---|---|
| Fri → Mon 9pm | Everyone not on a break sees *"This week's Konu is open — want to take it?"* with a countdown. |
| After you present | You get a ✓ and stop seeing the prompt until 5 others have presented (capped at group size − 1). |
| Mon 9pm, nobody volunteered | The backup queue asks the first available person: *"No one volunteered — can you present?"* |
| No / no answer in 24h | It passes to the next person. Anyone who presents or passes moves to the end of the queue. |
| Queue runs out | The slot opens to everyone, including people on a break. |
| Thursday | Sohbet. Afterwards the week goes into **Past topics**. |

Other features:
- **Hadis:** Eehsan (or anyone) posts the text, source and discussion notes.
- **Konu:** title, type (Esma, Ayet, Siyer, Daily iman), summary and prep notes for people to skim beforehand.
- **Host:** people tap "I can host", then someone confirms the host, address, time and food notes. There's also a "who's bringing what" list.
- **Weeks:** you can claim upcoming weeks ahead of time, cancel a week, or share a summary to WhatsApp.
- **No logins:** you tap your name once and that phone remembers you. Everyone can manage members and the queue order (👥 icon).

## Deploy to Cloudflare Workers (recommended, free, no badge)

1. In Cloudflare: **Workers & Pages → Create → Import a repository → GitHub → thu-bros → Deploy**.
2. That's it. `wrangler.jsonc` defines the page (`public/`), `/api`, the KV storage and the hourly cron.

The entry point is `cloudflare/worker.mjs`, and the data lives in one Workers KV key.

## Deploy to Netlify (alternative)

1. Push this folder to a GitHub repo.
2. In Netlify, go to **Add new site → Import an existing project** and pick the repo.
   The build settings are read from `netlify.toml`: publish folder `public`, functions in `netlify/functions`.
3. Deploy, then share the URL in the WhatsApp group.

You don't need a database or any environment variables, because data is stored in **Netlify Blobs** automatically.
`tick` is a scheduled function that runs every hour to move the backup queue along. Scheduled functions only run on the live production deploy.

The timezone is taken from the first visitor's browser. You can see it at the bottom of the 👥 sheet.

## Run locally

```bash
npm run dev            # http://localhost:8888, data saved in .data/state.json
NOW_OFFSET_DAYS=3 npm run dev   # pretend it's 3 days later (to test the queue)
npm test               # logic tests
```

Or use `netlify dev` with the Netlify CLI to test against real Blobs.

## Structure

```
public/            index.html · styles.css · app.js (no framework, no build step)
lib/core.mjs       the rules: weekly cycle, cooldown, backup queue, actions
lib/server.mjs     HTTP layer (GET state / POST action)
lib/blob-store.mjs Netlify Blobs storage
netlify/functions/ api.mjs (/api) · tick.mjs (hourly)
dev-server.mjs     local preview
test/              logic tests
```

To change the rules (sohbet day, cutoff, 24h window), edit `DEFAULT_SETTINGS` in `lib/core.mjs`.
