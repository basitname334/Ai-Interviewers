# Deploying AI Interviewer: Render (Backend) + Vercel (Frontend)

This project is a monorepo: **backend** (Node/Express/Prisma) and **frontend** (Next.js). Deploy the backend on **Render** and the frontend on **Vercel**, then connect them with environment variables.

---

## 1. Deploy Backend on Render

### Option A: Using the Blueprint (`render.yaml`)

1. Push this repo to GitHub and connect it to [Render](https://render.com).
2. In Render Dashboard: **New** → **Blueprint** → connect the repo.
3. Render will create a **Web Service** from `render.yaml` with `rootDir: backend`.
4. Add a **PostgreSQL** database (Dashboard → New → PostgreSQL) and copy its **Internal Database URL** (or External if you need off-Render access).
5. Open the **ai-interviewer-backend** service → **Environment** and set:

| Variable | Required | Example / Notes |
|----------|----------|------------------|
| `DATABASE_URL` | Yes | From Render PostgreSQL (Internal URL) |
| `FRONTEND_URL` | Yes | Your Vercel app URL, e.g. `https://your-app.vercel.app` (no trailing slash) |
| `JWT_SECRET` | Yes | Long random string (e.g. `openssl rand -hex 32`) |
| `REDIS_URL` | No | Omit or set to `memory` to skip Redis; or use Render Redis URL |
| `OPENROUTER_API_KEY` | No | For AI; get from [OpenRouter](https://openrouter.ai) |
| `OPENROUTER_MODEL` | No | e.g. `openai/gpt-4o-mini` |
| `NODE_ENV` | No | Set to `production` (Blueprint sets this) |

6. **Build**: Render runs `npm ci && npm run build` in `backend/` (Prisma generate + TypeScript compile).
7. **Start**: `npm start` runs `node dist/index.js`. Render sets `PORT` automatically.
8. After deploy, note the backend URL, e.g. `https://ai-interviewer-backend.onrender.com`.

### Option B: Manual Web Service

1. **New** → **Web Service** → connect the same repo.
2. Set **Root Directory** to `backend`.
3. **Build Command**: `npm ci && npm run build`
4. **Start Command**: `npm start`
5. Add the same environment variables as above.
6. Add a PostgreSQL database and set `DATABASE_URL`.

### Database setup on Render

- Create a PostgreSQL instance in Render and use its **Internal Database URL** as `DATABASE_URL`.
- After first deploy, run migrations from your machine (or a one-off job):

  ```bash
  cd backend
  DATABASE_URL="<Render Internal Database URL>" npx prisma db push
  # Optional: seed
  DATABASE_URL="<Render Internal Database URL>" npm run db:seed
  ```

---

## 2. Deploy Frontend on Vercel

1. Push the repo to GitHub and connect it to [Vercel](https://vercel.com).
2. When adding the project, set **Root Directory** to `frontend`.
3. In **Settings** → **Environment Variables**, add:

| Variable | Required | Example / Notes |
|----------|----------|------------------|
| `BACKEND_URL` | Yes | Backend origin, e.g. `https://ai-interviewer-backend.onrender.com` (no trailing slash, no `/api/v1`) |
| `NEXT_PUBLIC_WS_URL` | Yes | Same as `BACKEND_URL` (Socket.io / WebSocket) |
| `NEXT_PUBLIC_API_URL` | No | Same as `BACKEND_URL` (used by voice interview component) |

4. Redeploy so the build picks up these variables (especially `NEXT_PUBLIC_*`).
5. Copy your Vercel URL (e.g. `https://your-app.vercel.app`) and set it as `FRONTEND_URL` in the Render backend service (see above), then redeploy the backend if needed.

---

## 3. Avoid Common Errors

- **CORS / connection refused**: Ensure `FRONTEND_URL` on Render exactly matches your Vercel URL (no trailing slash). Backend allows that origin for CORS and Socket.io.
- **API 503 / Backend unavailable**: Ensure `BACKEND_URL` on Vercel is the Render service URL (HTTPS). Render free tier may spin down after inactivity; first request can be slow.
- **Socket.io not connecting**: Set `NEXT_PUBLIC_WS_URL` to the same backend origin. It is embedded at build time, so change it in Vercel and redeploy.
- **Prisma / DB errors on Render**: Ensure `DATABASE_URL` is set and run `npx prisma db push` (or migrations) against that database once.
- **Build fails on Render**: Ensure `rootDir` is `backend` and build command is `npm ci && npm run build`. `@prisma/client` is in `dependencies` so production install has it.
- **Build fails on Vercel**: Ensure root directory is `frontend` and `BACKEND_URL` is set (optional for build, but required for runtime).

---

## 4. Quick checklist

**Render (backend)**  
- [ ] Root directory: `backend`  
- [ ] Build: `npm ci && npm run build`  
- [ ] Start: `npm start`  
- [ ] `DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET` set  
- [ ] Health check: `https://<backend-url>/health` returns JSON  

**Vercel (frontend)**  
- [ ] Root directory: `frontend`  
- [ ] `BACKEND_URL` = backend origin (no `/api/v1`)  
- [ ] `NEXT_PUBLIC_WS_URL` = same as `BACKEND_URL`  
- [ ] `NEXT_PUBLIC_API_URL` = same (optional, for voice)  
- [ ] After changing `NEXT_PUBLIC_*`, redeploy  

**Both**  
- [ ] `FRONTEND_URL` (backend) = Vercel app URL  
- [ ] No trailing slashes on URLs  
