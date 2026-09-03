# OrbitPM

A full-featured, collaborative project management SaaS — a Trello/Jira-style Kanban board with real-time collaboration, role-based access control, AI-assisted workflows, and sprint/epic planning. Built as a supervised academic project following the MERN + TypeScript stack.

**Live demo:** _(add your deployed URL here after deployment)_

## Features

### Core
- **Auth**: JWT access + refresh tokens (httpOnly cookies), bcrypt password hashing, session rotation
- **Workspaces & RBAC**: 5 roles (Owner, Admin, PM, Member, Viewer), enforced server-side on every route — verified by automated security regression tests
- **Invitations**: real email delivery (Gmail SMTP), expiring/role-bound tokens, email-match verification before acceptance
- **Projects & Kanban boards**: drag-and-drop tasks (dnd-kit), custom columns (rename/reorder/delete with task migration), project color themes

### Collaboration
- **Comments** with @mention autocomplete and notifications
- **Activity log** — structured, human-readable history per task/project
- **Real-time updates** via Socket.io — task moves, comments, and notifications sync live across open sessions
- **File attachments** via Cloudinary (image/PDF/doc uploads, size/MIME restricted)

### Planning & Tracking
- **Epics** — group related tasks under a larger initiative
- **Sprints & Backlog** — plan, start, and complete time-boxed sprints; the board shows only the active sprint's work
- **Labels, checklists, story points, issue types** (Task/Bug/Story/Spike), due dates
- **List/Table view** with sortable columns and group-by (assignee/priority/epic), alongside the Kanban board
- **Command palette** (Ctrl+K) for quick navigation and cross-project search

### Insights & AI
- **Analytics dashboard** — completion trends, priority distribution, overdue tracking, workload by member, PDF export
- **Gemini-powered AI**: task breakdown into subtasks, project status summaries — always shown as editable suggestions, never auto-applied

### Production-minded
- Rate limiting, Helmet security headers, CORS allowlisting, input validation (Zod)
- Automated tests (Vitest + Supertest) covering auth flows, cross-workspace isolation, and RBAC enforcement
- Cascading workspace/project deletion with confirmation
- Full dark theme, mobile-responsive layout

## Stack

| Layer | Tech |
|---|---|
| Client | React + Vite + TypeScript + Tailwind CSS + TanStack Query + dnd-kit + Framer Motion |
| Server | Node.js + Express + TypeScript + Mongoose |
| Database | MongoDB Atlas |
| Realtime | Socket.io |
| AI | Google Gemini API |
| Email | Nodemailer (Gmail SMTP) |
| File storage | Cloudinary |
| Testing | Vitest + Supertest |

## Project Structure

```
orbitpm/
  client/   React application (src/pages, components, hooks, context, api)
  server/   Express API
    src/modules/   auth, users, workspaces, projects, tasks, comments,
                    activities, notifications, analytics, ai, epics, sprints, search
    scripts/seed.ts  demo data seed script
```

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (free tier is enough)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com) (optional — AI features degrade gracefully without one)
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) (optional — invites fall back to a shareable link without it)
- A free [Cloudinary](https://cloudinary.com) account (optional — attachments are disabled gracefully without it)

### 1. Server

```bash
cd server
npm install
cp .env.example .env   # fill in MONGO_URI, JWT secrets, and optional integrations
npm run dev
```

Runs on `http://localhost:5000`. Health check: `GET /health`.

### 2. Client

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`, proxies `/api` and `/socket.io` to the server in development.

### 3. Seed demo data (optional)

```bash
cd server
npm run seed
```

Wipes existing workspace data and creates 2 realistic demo workspaces with projects, tasks, and epics, owned by the account you specify in `scripts/seed.ts`.

### 4. Run tests

```bash
cd server
npm test
```

Covers auth flows and — most importantly — cross-workspace security isolation and role-based access control regression tests.

## Deployment

- **Server** → [Render](https://render.com) (Node web service, root directory `server`)
- **Client** → [Vercel](https://vercel.com) (static Vite build, root directory `client`)
- **Database** → MongoDB Atlas (same cluster as development)

Set `VITE_API_URL` on Vercel to the deployed Render URL, and `CLIENT_URL` on Render to the deployed Vercel URL, so CORS and cookies work across the two domains.

## Demo Script

1. Register an account, sign in
2. Create a workspace, then a project (default columns are created automatically)
3. Add a few tasks, drag them between columns; try the List view and Command Palette (Ctrl+K)
4. Open a task, add a comment with an @mention, try "✨ Suggest subtasks with AI"
5. Create a sprint from the Backlog, start it, and watch the board filter to just that sprint's work
6. Open a second browser (or incognito) with a different account, join the same project via an email invite, and watch changes sync live
7. Check the Analytics page for charts and export a PDF report
8. Try accessing another workspace's project without an invite — confirm it's rejected (403)

## Environment Variables

See `server/.env.example` and `client/.env.example` for the full list. Never commit a real `.env` file — both are gitignored.

## License

Academic project — built as a supervised coursework submission.
