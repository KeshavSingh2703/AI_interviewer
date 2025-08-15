# AI Interviewer Web

A full‑stack web app that brings Rick, your AI interviewer, to the browser. Practice role‑specific interviews, get instant feedback, and download PDF reports.

### Features

- **AI‑powered interviews** with real‑time feedback
- **Role‑specific question sets** plus general questions
- **Auth** (register/login) with JWT
- **Interview history** and **PDF report** download

### Tech Stack

- **Frontend**: React (CRA), React Router, Tailwind CSS, Axios
- **Backend**: Node.js, Express.js, MongoDB Atlas, JWT, Multer, PDFKit
- **Optional**: Ollama local LLM for richer evaluations (fallback provided)

## Project Structure

```
ai-interviewer-web/
  backend/      # Express API
  frontend/     # React app
  MONGODB_SETUP.md
```

## Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas cluster (or local MongoDB)
- (Optional) Ollama installed locally

## Setup

### 1) Backend

```bash
cd backend
cp config.env.example config.env
# Open config.env and fill in placeholders
npm install
npm run dev   # or: npm start
```

Backend runs at `http://localhost:8000`.

Environment file used by the server is `backend/config.env` (loaded via dotenv). See sample below; do not commit real values.

```env
# backend/config.env
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<db-name>?retryWrites=true&w=majority
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=24h
```

For help creating a secure connection string without exposing secrets, see `MONGODB_SETUP.md`.

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000` and proxies API requests to `http://localhost:8000` (see `frontend/package.json`). For production builds, update the API base URL in `frontend/src/services/api.js` to your deployed backend URL.

## Usage

1. Register/Login
2. Start an interview for a selected role
3. Answer questions and receive feedback
4. Complete the interview and download the report

## API Overview

- `POST /api/register`
- `POST /api/login`
- `GET /api/roles`
- `POST /api/interview/start`
- `POST /api/interview/submit-answer/:session_id`
- `POST /api/interview/complete/:session_id`
- `GET /api/interview/session/:session_id`
- `GET /api/user/interviews`
- `GET /api/interview/report/:session_id` (PDF)

## Security & Secrets

- Do not commit `backend/config.env` or any secrets.
- Use placeholders in docs and code comments. Keep real MongoDB credentials in local env only.
- Rotate `JWT_SECRET` for production and restrict Atlas network access.

## Deployment Notes

- Backend: deploy Node/Express (Render, Railway, Heroku alternative, etc.). Set env vars from your provider’s dashboard.
- Frontend: build (`npm run build`) and deploy (Vercel/Netlify). Point the app to your API by updating `frontend/src/services/api.js`.

## References

- MongoDB setup guide: `MONGODB_SETUP.md`

## License

MIT
