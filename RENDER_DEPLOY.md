# Deploy backend on Render

This guide deploys **only the FastAPI backend** from the repo root.

## 1. Push code to GitHub

Render pulls from Git. Make sure this repository is on GitHub and up to date.

## 2. Create a Web Service on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Use these settings:

| Setting | Value |
|---------|--------|
| **Name** | `material-test-report-api` (or any name) |
| **Region** | Closest to your users |
| **Root Directory** | *(leave blank — use repo root)* |
| **Runtime** | Python 3 |
| **Build Command** | `./build.sh` (or `pip install --upgrade pip && pip install -r requirements.txt`) |
| **Start Command** | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/api/health` |

Or use **Blueprint**: connect the repo and Render will read `render.yaml` automatically.

## 3. Set environment variables

Before the API can accept logins, add these in **Environment**:

### Required

| Key | Description |
|-----|-------------|
| `JWT_SECRET_KEY` | Random secret for JWT tokens (see below) |
| `PASSWORD_HASH_MAHESH_CHAVAN` | Bcrypt hash for Mahesh Chavan |
| `PASSWORD_HASH_RAHUL_KARAPE` | Bcrypt hash for Rahul Karape |
| `PASSWORD_HASH_DIGEMBER` | Bcrypt hash for Digember |
| `PASSWORD_HASH_QA_LAB` | Bcrypt hash for Q/A Lab |

### Optional

| Key | Default | Description |
|-----|---------|-------------|
| `JWT_EXPIRE_HOURS` | `12` | Token lifetime in hours |

### Generate values locally

From the project folder (after passwords are set up once locally):

```bat
cd backend
python scripts\print_render_env.py
```

Copy the printed lines into Render → **Environment** → **Add Environment Variable**.

Alternatively, run `python setup_auth.py` in `backend/` locally, then run `print_render_env.py`.

## 4. Deploy

Click **Deploy**. When the build finishes, open:

```
https://YOUR-SERVICE.onrender.com/api/health
```

You should see:

```json
{
  "message": "Material Test Report Generator API",
  "status": "running",
  "auth_configured": true
}
```

If `auth_configured` is `false`, add the `PASSWORD_HASH_*` variables from step 3.

## 5. Connect the frontend

Point your React app at the deployed API:

```
REACT_APP_API_URL=https://YOUR-SERVICE.onrender.com
```

Rebuild and deploy the frontend separately (Render Static Site, Vercel, Netlify, etc.).

## Project layout (backend)

```
material test report generator/
├── app.py                 ← Render entry point (loads backend/app.py)
├── build.sh               ← Render build script
├── requirements.txt       ← Python dependencies
├── runtime.txt            ← Python 3.11.9 (Render)
├── .python-version        ← Python 3.11.9 (local/pyenv)
├── render.yaml            ← Render Blueprint
├── Procfile               ← Start command fallback
└── backend/
    ├── app.py             ← FastAPI application
    ├── config.py          ← Auth & paths
    ├── routes/            ← API endpoints
    ├── services/          ← Excel, auth logic
    ├── uploads/           ← Uploaded Excel files (ephemeral on Render)
    ├── outputs/           ← Generated reports (ephemeral)
    └── data/              ← Optional bundled requirement files
```

## Notes

- **Uploads are not persistent** on Render’s free tier (disk resets on redeploy). Users must re-upload Excel files after each deploy unless you add a Render disk.
- **Auth via env vars** is recommended for production. The in-browser setup (`POST /api/auth/setup`) writes to disk and may not survive redeploys.
- **CORS** is open (`*`) so any frontend origin can call the API. Restrict in `backend/app.py` if needed.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on `numpy` | Ensure `runtime.txt` uses Python 3.11 and build uses root `requirements.txt` |
| `ModuleNotFoundError: fastapi` | Root Directory must be blank (repo root), not `backend` |
| Login returns 503 | Set all four `PASSWORD_HASH_*` env vars |
| Login crashes / 500 | Set `JWT_SECRET_KEY` in Render Environment |
| Health check fails | Confirm Start Command uses `$PORT`, not a fixed port like 8000 |
