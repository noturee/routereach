# Testing Checklist — Phase 1

Run these manual tests after standing up the app locally to confirm Phase 1 is working.

## Backend Setup
- [ ] `python -m venv venv && source venv/bin/activate`
- [ ] `pip install -r requirements.txt` — installs without errors
- [ ] Copy `.env.example` → `.env`, fill in `DATABASE_URL` and `SECRET_KEY`
- [ ] `createdb outreachroutepro`
- [ ] `flask db init && flask db migrate && flask db upgrade` — no errors
- [ ] `psql -d outreachroutepro -f database/seed.sql` — inserts admin user
- [ ] `flask run` — starts on port 5000

## Backend API Tests
- [ ] `GET /api/health` → `{"status": "ok"}`
- [ ] `POST /api/auth/login` with `{"email": "admin@outreachroutepro.com", "password": "Admin1234!"}` → returns `access_token`
- [ ] `GET /api/auth/me` with `Authorization: Bearer <token>` → returns admin user object
- [ ] `GET /api/users` with admin token → returns array with one user
- [ ] `POST /api/auth/login` with wrong password → returns 401
- [ ] `GET /api/users` without token → returns 401
- [ ] Any stub route (e.g. `GET /api/applicants`) → returns 501 with "Coming in Phase X" message

## Frontend Setup
- [ ] `cd frontend && npm install` — installs without errors
- [ ] Copy `.env.example` → `.env`
- [ ] `npm run dev` — starts on port 5173

## Frontend Smoke Tests
- [ ] Browse to `http://localhost:5173` — redirects to `/login`
- [ ] Login page renders with logo, email/password fields, and submit button
- [ ] Login with `admin@outreachroutepro.com` / `Admin1234!` → redirects to `/admin-dashboard`
- [ ] All sidebar links render
- [ ] Logout button works → redirects to `/login`
- [ ] Navigating to `/admin-dashboard` without being logged in redirects to `/login`
- [ ] OA-only route (e.g. `/dashboard`) is accessible when logged in as admin
- [ ] No console errors on initial page load (except placeholder API calls returning 501)

## Docker (optional)
- [ ] `docker-compose up --build` — all 3 services start
- [ ] Frontend accessible on port 5173
- [ ] Backend accessible on port 5000
