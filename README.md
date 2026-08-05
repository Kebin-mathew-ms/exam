# AI-Powered Accessible Online Examination System (Aegis)

A modern, production-grade foundation setup for the **AI-Powered Accessible Online Examination System**. This setup establishes a robust, secure, and highly scalable architecture for both the backend (FastAPI) and frontend (React 19 + Vite).

---

## 🏗️ Architecture & Technologies

### 🖥️ Frontend Stack
- **React 19** - UI core rendering
- **Vite** - High-speed bundler & development server
- **Tailwind CSS v3** - Modern HSL design tokens & style variables
- **React Router DOM** - Application view routers & auth guard controls
- **React Hook Form** - Dynamic validation & submission handling
- **Axios** - Service clients with automated JWT refresh interceptors
- **Lucide Icons** - Accessible, vectorized interface iconography

### ⚙️ Backend Stack
- **FastAPI** - High performance, asynchronous Python web API
- **SQLAlchemy ORM (v2.0)** - Advanced MySQL object-relational mapper
- **Alembic** - Relational schema migrations manager
- **BCrypt Hashing** - Raw bcrypt password hashing
- **PyJWT / Python-Jose** - Tokenization security engine
- **SlowAPI** - Rate-limiting structures protection
- **MySQL** - Secure enterprise datastore

---

## 📂 Project Structure

```text
accessible-exam-system/
├── backend/
│   ├── app/
│   │   ├── api/            # API Endpoints (Auth, Users, Profiles)
│   │   ├── auth/           # Hashing, dependencies, & guards
│   │   ├── config/         # Settings loader (Pydantic-Settings)
│   │   ├── database/       # SQLAlchemy engine & session lifecycle
│   │   ├── middleware/     # CORS, custom security headers, rate limiting
│   │   ├── models/         # SQLAlchemy schemas (Role, User, Token)
│   │   ├── services/       # Auditing & business services
│   │   ├── utils/          # Logging handlers & utilities
│   │   └── main.py         # FastAPI application entrypoint
│   ├── alembic/            # Database migration history
│   ├── scripts/            # SQL Init & Python seeding scripts
│   ├── requirements.txt    # Python backend manifests
│   └── alembic.ini         # Alembic configurations
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components (Loader, Dialog, Toast)
│   │   ├── contexts/       # React Contexts (Auth, Theme, Toast)
│   │   ├── hooks/          # Custom Hooks (useAuth, useToast)
│   │   ├── layouts/        # Dashboard layouts structure
│   │   ├── pages/          # Login, Dashboard, Profile, Users CRUD views
│   │   ├── routes/         # Guard route wrappers
│   │   ├── services/       # Axios API client instances
│   │   ├── utils/          # Tailwind class mergers
│   │   ├── App.jsx         # App router mount
│   │   └── main.jsx        # Root document DOM mount
│   ├── tailwind.config.js  # Tailwind design setups
│   └── vite.config.js      # Vite alias configurations
├── .env.example            # Backend & Frontend configurations
├── .env                    # Active configurations (gitignored)
└── README.md               # Setup instructions and guide
```

---

## ⚙️ Initial Installation & Setup

### 1. Database Setup
Ensure that your **MySQL Server** is running (default port `3306`).
- Copy `.env.example` to `.env` in the root folder.
- Open `.env` and fill in your MySQL server credentials (`DB_USERNAME` and `DB_PASSWORD`). By default, the app is preconfigured to use `root` with the password `root`.

### 2. Backend Initialization
Initialize the Python virtual environment and seed the database schemas/records:
```bash
# Navigate to workspace
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Unix:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run initial MySQL database creation and seeding script
python scripts/init_db.py

# Stamp Alembic to the latest head revision
alembic stamp head

# Start local server
uvicorn app.main:app --reload --port 8000
```
Swagger API docs will be active at: `http://localhost:8000/docs`

### 3. Frontend Initialization
Setup, configure, and launch the React client:
```bash
# Navigate to frontend
cd frontend

# Install package dependencies
npm install

# Run Vite local dev server
npm run dev
```
Vite app will launch at: `http://localhost:5173/`

---

## 🛡️ Authentication Details & Seeds

The backend uses a standard JWT token flow with active **Refresh Token Rotation**. On login, the client receives `access_token` (expires in 30 mins) and `refresh_token` (expires in 7 days). The Axios interceptor automatically manages tokens and rotates them as needed.

### Standard Seed Logins:
- **Administrator Role**
  - **Email**: `admin@exam.com`
  - **Password**: `Admin123!`
- **Student Role**
  - **Email**: `student@exam.com`
  - **Password**: `Student123!`

---

## 📡 REST API Reference

### Authentication Routing
- `POST /api/auth/login` - Verify credentials, issue tokens, log audit events
- `POST /api/auth/logout` - Revoke current refresh token, log audit events
- `GET /api/auth/me` - Fetch details of the active user session
- `POST /api/auth/refresh` - Rotate old refresh token and issue fresh token sets

### User & Directory Management (Admin Restricted)
- `GET /api/users` - Fetch list of registered users
- `POST /api/users` - Create a user (automatically configures blank Student Profiles if role is student)
- `GET /api/users/{user_id}` - Retrieve details of a user profile
- `PUT /api/users/{user_id}` - Update details (hashes password if updated, logs security events)
- `DELETE /api/users/{user_id}` - Purge user registration and cascade profile deletions

### Student Profiles Routing
- `GET /api/users/{user_id}/profile` - Load student profile details
- `POST /api/users/{user_id}/profile` - Create profile
- `PUT /api/users/{user_id}/profile` - Update details (verifies unique enrollment bounds)
- `DELETE /api/users/{user_id}/profile` - Delete student profile info
