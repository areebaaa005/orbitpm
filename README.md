# OrbitPM

A collaborative project management SaaS — MERN stack + TypeScript, with real-time collaboration, role-based access control, analytics, and AI-assisted workflows. Built as a Trello/Jira-style Kanban board.

## Features

- **Auth**: JWT access + refresh tokens, HttpOnly cookies, bcrypt password hashing
- **Workspaces & RBAC**: 5 roles (Owner, Admin, PM, Member, Viewer), server-enforced on every route
- **Invitations**: expiring, role-bound, email-verified acceptance
- **Projects & Boards**: Kanban columns, drag-and-drop tasks with persisted ordering
- **Collaboration**: comments, activity log, in-app notifications
- **Realtime**: Socket.io — live task moves, comments, and notifications across browser sessions
- **Analytics**: completion trends, priority distribution, overdue tracking, workload by member
- **AI**: Gemini-powered task breakdown and project status summaries (editable suggestions, never auto-applied)

## Stack

| Layer | Tech |
|---|---|
| Client | React + Vite + TypeScript + Tailwind CSS + TanStack Query + dnd-kit |
| Server | Node.js + Express + TypeScript + Mongoose |
| Database | MongoDB Atlas |
| Realtime | Socket.io |
| AI | Google Gemini API |
| Testing | Vitest + Supertest |

## Project Structure

```
orbitpm/
  client/   React application
  server/   Express API
    src/modules/   auth, users, workspaces, projects, tasks, comments,
                    activities, notifications, analytics, ai
  shared/   Reserved for shared types/constants
```

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (free tier is enough)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com) (optional — AI features degrade gracefully without one)

### 1. Server

```bash
cd server
npm install
cp .env.example .env   # fill in MONGO_URI, JWT secrets, GEMINI_API_KEY
npm run dev
```

Runs on `http://localhost:5000`. Health check: `GET /health`.

### 2. Client

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`, proxies `/api` and `/socket.io` to the server.

### 3. Run tests

```bash
cd server
npm test
```

Covers auth flows and — most importantly — cross-workspace security isolation and role-based access control regression tests.

## Demo Script

1. Register an account, sign in
2. Create a workspace, then a project (default columns are created automatically)
3. Add a few tasks, drag them between columns
4. Open a task, add a comment, try "✨ Suggest subtasks with AI"
5. Open a second browser (or incognito) with a different account, join the same project, and watch changes sync live
6. Check the Analytics page for completion/priority charts
7. Try accessing another workspace's project without an invite — confirm it's rejected (403)

## Environment Variables

See `server/.env.example` for the full list. Never commit a real `.env` file — it's gitignored.

## License

Academic project — built as a supervised coursework submission.
