# Deployment

Two ways to host it. Both use the same code.

| Option | What runs where | When to use it |
|---|---|---|
| **A. Render only** | One Node service serves the API and the frontend | Simplest. A complete deployment on its own |
| **B. Render + Vercel** | Render runs the API. Vercel serves the static frontend and calls the API on Render | Faster page loads from Vercel's CDN, and the frontend can be redeployed apart from the API |

## About the ML

There is no separate ML service to host. Retrieval is local TF-IDF (`ml/tfidf.mjs`): plain JavaScript that runs inside the backend process, with no model, no GPU and no model download. It stays in the Render service. If a model is added later (AGENTS.md rule 20 puts all model calls behind `src/ai/`), that is the point at which a second service becomes worth the extra hop.

## 1. Backend on Render

The repo has a Blueprint, `render.yaml`.

1. Push this repo to GitHub (it is already at `Simacoder/inzulolwazi`).
2. In Render choose **New → Blueprint**, pick the repo and branch, and apply. Render reads `render.yaml`.
3. When the first deploy is live, open `https://<your-service>.onrender.com/api/v1/health`. It should return `{"status":"ok", ...}`.
4. Open the service URL itself. With option A you are done: the app is there.

What the Blueprint sets, and why:

- `HOST=0.0.0.0`: the server listens on `127.0.0.1` locally. Render's router needs it on all interfaces.
- `TRUST_PROXY=true`: Render sits in front of the service. Without this every visitor would share one rate-limit budget. The server reads the last `X-Forwarded-For` entry, the address Render itself saw.
- `healthCheckPath=/api/v1/health`: Render restarts the service if it stops answering.
- `PORT` is supplied by Render. Do not set it.
- The app has no runtime dependencies, so the build is `npm ci --omit=dev`. There are no secrets to configure.

The free plan sleeps after about 15 minutes without traffic, and the first request afterwards takes tens of seconds. Use a paid plan, or a ping that calls `/api/v1/health` every 10 minutes, if that matters for a demo.

## 2. Frontend on Vercel (option B)

1. In Vercel choose **Add New → Project** and import the same repo.
2. Leave the framework preset as **Other**. `vercel.json` sets the build command (`npm run build:frontend`) and the output folder (`dist`).
3. Under **Environment Variables** add `API_BASE_URL` with the Render address, for example `https://inzulolwazi-api.onrender.com`. No trailing slash and no path.
4. Deploy. The build copies `frontend/` to `dist/`, writes the API address into `js/config.mjs`, and adds a Content-Security-Policy that allows requests to that address and nowhere else.

The API already sends `Access-Control-Allow-Origin: *` (it is read-only public data), so the browser may call it from the Vercel domain. Pages use hash routes, so no rewrites are needed.

If you change `API_BASE_URL`, redeploy: the address is baked in at build time.

## Check it

```bash
npm run check                      # lint, types, content, tests, evaluation
API_BASE_URL=https://<render-url> npm run build:frontend && ls dist
curl https://<render-url>/api/v1/health
curl "https://<render-url>/api/v1/search?q=Bantu"
```

## Before real traffic

- All topics are drafts and the isiZulu text is machine translated. Deploying does not change that, and the app says so.
- Logs record retrieved ids and scores but not question text. Render keeps its own request logs, so say so in any privacy note.
- Review the rate limit (`RATE_LIMIT_PER_MINUTE`, default 120) against expected use.
