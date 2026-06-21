# Material Test Report Generator

Full-stack app for generating material test reports from metallurgy data into an Excel template (logo preserved).

## Features
- Secure login (4 fixed users, bcrypt passwords in `.env`, JWT sessions)
- Upload metallurgy (required), specification (optional), template (required)
- Search by Heat No + Casting Name
- Preview and edit all fields before download
- Excel output with company logo preserved (openpyxl)

## Fixed users
1. Mahesh Chavan
2. Rahul Karape
3. Digember
4. Q/A Lab

## First-time setup (passwords)
Run once — you will be prompted for a password for each user (no hardcoded passwords):

```bat
setup.bat
```

Or:

```bash
cd backend
python scripts/setup_passwords.py
```

Hashes are written to `backend/.env`. You can also use the **Initial Setup** screen in the web UI on first launch.

## Run the app

**Backend** (port 8000):

```bat
start-backend.bat
```

**Frontend** (port 3000):

```bat
start-frontend.bat
```

Open http://localhost:3000

## Workflow
1. Login (select user + password)
2. Upload metallurgy sheet, optional specification, and template
3. Enter Heat No + Casting Name → **Search**
4. Preview: edit basic info, chemical, and mechanical tables
5. **Download Final Report** → Excel with template layout and logo

## API (requires `Authorization: Bearer <token>`)
- `GET /api/auth/status` — setup / user list
- `POST /api/auth/setup` — first-time password setup
- `POST /api/auth/login` — JWT token
- `POST /api/upload_metallurgy` — actual values sheet
- `POST /api/upload_specification` — optional spec sheet
- `POST /api/upload_template` — report template
- `POST /api/search` — preview JSON by heat + casting
- `POST /api/generate_report` — filled Excel download

## Project structure
- `backend/` — FastAPI, pandas, openpyxl
- `frontend/public/` — web UI (`index.html`, `script.js`, `style.css`)
