# OrbitPM

A MERN + TypeScript project management SaaS — collaborative workspaces, projects, Kanban boards, real-time updates, and AI-assisted task management.

## Stack

- **Client:** React + Vite + TypeScript + Tailwind CSS + TanStack Query
- **Server:** Node.js + Express + TypeScript + Mongoose
- **Database:** MongoDB Atlas
- **Realtime:** Socket.io
- **Auth:** JWT (access + refresh) with HttpOnly cookies
- **AI:** Google Gemini API

## Project Structure

```
orbitpm/
  client/   - React application
  server/   - Express API
  shared/   - Shared types/constants
  docs/     - API notes, architecture decisions
```

## Getting Started (Server)

```bash
cd server
npm install
cp .env.example .env   # then fill in your real MongoDB URI and secrets
npm run dev
```

Server runs on `http://localhost:5000`. Health check: `GET /health`.

## Development Roadmap

See `docs/roadmap.md` for the day-by-day build plan.

## Status

Under active development.
