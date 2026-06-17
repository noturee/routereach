# OutreachRoute Pro

A national web-based outreach, admissions, route planning, applicant tracking, messaging, reporting, and performance management platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6, Axios |
| Backend | Python Flask, Flask-SQLAlchemy, Flask-JWT-Extended |
| Database | PostgreSQL |
| Maps | Google Maps JavaScript API |
| Email | SendGrid / Amazon SES |
| SMS | Twilio |
| Hosting | AWS (Amplify + Elastic Beanstalk + RDS) |

---

## Project Structure

```
routereach/
├── frontend/          React + Vite frontend
├── backend/           Python Flask backend
├── database/          SQL schema, seed data, sample uploads
├── docs/              Documentation
├── docker-compose.yml Local development with Docker
└── README.md
```

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/noturee/routereach.git
cd routereach
```

---

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
cp .env.example .env
# Edit .env and fill in your values
```

Create the PostgreSQL database:

```bash
createdb outreachroutepro
```

Run database migrations:

```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

Seed initial data (admin user + message templates):

```bash
psql -d outreachroutepro -f ../database/seed.sql
```

Start the backend:

```bash
flask run
# Backend runs at http://localhost:5000
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env and fill in your values
npm run dev
# Frontend runs at http://localhost:5173
```

---

### 4. Docker (Optional)

Run everything with Docker Compose:

```bash
docker-compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432

---

## Default Admin Credentials (Development Only)

After running the seed file:

```
Email:    admin@outreachroutepro.com
Password: Admin1234!
```

**Change immediately in production.**

---

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for all required variables.

Never commit `.env` files to Git.

---

## Build Phases

| Phase | Feature |
|---|---|
| 1 | Project foundation and layout |
| 2 | Authentication and role-based access |
| 3 | Territory management |
| 4 | Applicant management |
| 5 | Missing document tracker |
| 6 | Case notes |
| 7 | Excel/CSV applicant upload |
| 8 | Outreach locations |
| 9 | Visit logs and marketing activity |
| 10 | Outreach map and target area finder |
| 11 | Route planner |
| 12 | Messaging center |
| 13 | Real email and SMS integration |
| 14 | Meeting scheduler |
| 15 | My Numbers dashboard |
| 16 | Reports |
| 17 | Monthly reports |
| 18 | Team performance dashboard |
| 19 | Admin management |
| 20 | AWS deployment readiness |

---

## User Roles

| Role | Scope |
|---|---|
| Master Admin | Full system access |
| National Admin | All assigned states and regions |
| Regional Admin | Assigned regions or states |
| State Admin | One or more assigned states |
| Local Admin / Supervisor | Assigned counties, cities, ZIP codes, or teams |
| OA User / Field User | Assigned applicants, territories, locations |

---

## License

Private — Internal Use Only
