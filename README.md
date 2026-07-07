# EmailShield – AI Email Validation Platform

## 🚀 Quick Start

### Step 1: Supabase Setup
1. Go to https://supabase.com → Create new project
2. Go to SQL Editor → paste contents of `supabase_setup.sql` → Run
3. Go to Authentication → Users → Add User:
   - `admin@emailshield.com` / `Admin@123`
   - `manager@emailshield.com` / `Manager@123`
4. Run in SQL Editor to set admin role:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@emailshield.com';
   ```
5. Copy your **Project URL** and **anon key** from Settings → API

### Step 2: Configure Environment Variables

**frontend/.env**
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
VITE_API_URL=http://localhost:5000
```

**backend/.env**
```
PORT=5000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret
FRONTEND_URL=http://localhost:5173
```

### Step 3: reCAPTCHA Setup
1. Go to https://www.google.com/recaptcha/admin/create
2. Choose **reCAPTCHA v2 – "I'm not a robot"**
3. Add domain: `localhost`
4. Copy site key → `VITE_RECAPTCHA_SITE_KEY`
5. Copy secret key → `RECAPTCHA_SECRET_KEY` (backend)

> **Note:** The default keys in `.env` are Google's public test keys – they always pass and work for local development.

### Step 4: OpenAI Setup (Optional)
1. Go to https://platform.openai.com/api-keys
2. Create API key → paste into `backend/.env` as `OPENAI_API_KEY`
3. Without this, the app uses smart rule-based fallback reasons

### Step 5: Run the App

**Terminal 1 – Backend:**
```bash
cd backend
node src/server.js
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## 📁 Project Structure
```
noting/
├── frontend/          # React + Tailwind CSS
│   ├── src/
│   │   ├── context/   # Auth context
│   │   ├── lib/       # Supabase client
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── admin/  # Admin dashboard + bulk validate
│   │       └── manager/ # Manager single validate
│   └── .env
├── backend/           # Node.js + Express
│   ├── src/
│   │   ├── config/    # Supabase client
│   │   ├── routes/    # API routes
│   │   └── utils/     # Email validator + AI analyzer
│   └── .env
└── supabase_setup.sql # Database schema
```

## 🔐 Roles
| Role    | Access |
|---------|--------|
| Admin   | Bulk validate (with CAPTCHA), full history, analytics |
| Manager | Single email validate, own history |

## 🛠 Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express, Server-Sent Events (SSE streaming)
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **AI:** OpenAI GPT-3.5 (with rule-based fallback)
- **Security:** Google reCAPTCHA v2, Helmet, Rate limiting
