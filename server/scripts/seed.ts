/**
 * Demo data seed script.
 *
 * WARNING: This clears all workspace-related collections (workspaces,
 * memberships, invitations, projects, columns, tasks, comments, activities,
 * notifications, epics, sprints) before creating fresh demo data. User
 * accounts and their login credentials are left untouched.
 *
 * Usage: npm run seed
 * The owner account is set via OWNER_EMAIL below — must already have a
 * registered account (register/login once in the app first).
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { User } from '../src/modules/users/user.model';
import { Workspace } from '../src/modules/workspaces/workspace.model';
import { Membership } from '../src/modules/workspaces/membership.model';
import { Invitation } from '../src/modules/workspaces/invitation.model';
import { Project } from '../src/modules/projects/project.model';
import { Column } from '../src/modules/projects/column.model';
import { Task } from '../src/modules/tasks/task.model';
import { Comment } from '../src/modules/comments/comment.model';
import { Activity } from '../src/modules/activities/activity.model';
import { Notification } from '../src/modules/notifications/notification.model';
import { Epic } from '../src/modules/epics/epic.model';
import { Sprint } from '../src/modules/sprints/sprint.model';

const OWNER_EMAIL = 'areeba@gmail.com';

const DEFAULT_COLUMNS = [
  { name: 'Backlog', order: 0, color: '#94a3b8' },
  { name: 'To Do', order: 1, color: '#60a5fa' },
  { name: 'In Progress', order: 2, color: '#fbbf24' },
  { name: 'Done', order: 3, color: '#34d399' },
];

function slugify(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI not set in .env');
  await mongoose.connect(mongoUri);
  console.log('[seed] Connected to MongoDB');

  const owner = await User.findOne({ email: OWNER_EMAIL });
  if (!owner) {
    throw new Error(
      `No user found with email "${OWNER_EMAIL}". Register/log in with this email in the app first, then re-run the seed.`
    );
  }
  console.log(`[seed] Owner: ${owner.name} <${owner.email}>`);

  console.log('[seed] Clearing old workspace data…');
  await Promise.all([
    Workspace.deleteMany({}),
    Membership.deleteMany({}),
    Invitation.deleteMany({}),
    Project.deleteMany({}),
    Column.deleteMany({}),
    Task.deleteMany({}),
    Comment.deleteMany({}),
    Activity.deleteMany({}),
    Notification.deleteMany({}),
    Epic.deleteMany({}),
    Sprint.deleteMany({}),
  ]);
  console.log('[seed] Old data cleared.');

  async function createWorkspace(name: string) {
    const workspace = await Workspace.create({ name, slug: slugify(name), ownerId: owner!._id });
    await Membership.create({ workspaceId: workspace._id, userId: owner!._id, role: 'owner' });
    return workspace;
  }

  async function createProject(workspaceId: mongoose.Types.ObjectId, name: string, key: string, color: string) {
    const project = await Project.create({
      workspaceId,
      name,
      key,
      color,
      members: [owner!._id],
      createdBy: owner!._id,
    });
    const columns = await Column.insertMany(
      DEFAULT_COLUMNS.map((c) => ({ ...c, projectId: project._id }))
    );
    return { project, columns };
  }

  async function createTask(
    workspaceId: mongoose.Types.ObjectId,
    projectId: mongoose.Types.ObjectId,
    columnId: mongoose.Types.ObjectId,
    order: number,
    data: {
      title: string;
      priority?: string;
      type?: string;
      storyPoints?: number;
      dueDate?: Date;
      labels?: { name: string; color: string }[];
      checklist?: { text: string; done: boolean }[];
      description?: string;
      epicId?: mongoose.Types.ObjectId;
    }
  ) {
    return Task.create({
      workspaceId,
      projectId,
      columnId,
      order,
      reporterId: owner!._id,
      assigneeIds: [owner!._id],
      priority: data.priority || 'medium',
      type: data.type || 'task',
      storyPoints: data.storyPoints,
      dueDate: data.dueDate,
      labels: data.labels || [],
      checklist: data.checklist || [],
      description: data.description,
      epicId: data.epicId,
      title: data.title,
    });
  }

  async function createEpic(
    projectId: mongoose.Types.ObjectId,
    workspaceId: mongoose.Types.ObjectId,
    name: string,
    color: string
  ) {
    return Epic.create({ projectId, workspaceId, name, color, createdBy: owner!._id });
  }

  // ---------- Workspace 1: Product Team ----------
  const ws1 = await createWorkspace('Product Team');

  const { project: webProject, columns: webCols } = await createProject(
    ws1._id,
    'Website Redesign',
    'WEB',
    '#5B5FEF'
  );
  const [webBacklog, webTodo, webProgress, webDone] = webCols;

  const homepageEpic = await createEpic(webProject._id, ws1._id, 'Homepage Revamp', '#5B5FEF');
  const perfEpic = await createEpic(webProject._id, ws1._id, 'Performance & Infra', '#10B981');

  await createTask(ws1._id, webProject._id, webBacklog._id, 0, {
    title: 'Research competitor landing pages',
    priority: 'low',
    type: 'task',
    storyPoints: 3,
    labels: [{ name: 'Research', color: '#06B6D4' }],
  });
  await createTask(ws1._id, webProject._id, webTodo._id, 0, {
    title: 'Design new homepage hero section',
    priority: 'high',
    type: 'story',
    storyPoints: 5,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    labels: [{ name: 'Design', color: '#8B5CF6' }],
    epicId: homepageEpic._id,
    checklist: [
      { text: 'Wireframe', done: true },
      { text: 'High-fidelity mockup', done: false },
      { text: 'Get stakeholder approval', done: false },
    ],
  });
  await createTask(ws1._id, webProject._id, webTodo._id, 1, {
    title: 'Fix broken navigation link on mobile',
    priority: 'urgent',
    type: 'bug',
    storyPoints: 1,
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue on purpose, for demo
    labels: [{ name: 'Mobile', color: '#EC4899' }],
  });
  await createTask(ws1._id, webProject._id, webProgress._id, 0, {
    title: 'Integrate contact form with backend API',
    priority: 'medium',
    type: 'task',
    storyPoints: 3,
    description: 'Wire the contact form submit handler to POST /api/v1/contact and show a success toast.',
  });
  await createTask(ws1._id, webProject._id, webDone._id, 0, {
    title: 'Set up CI/CD pipeline for staging',
    priority: 'medium',
    type: 'task',
    storyPoints: 2,
    epicId: perfEpic._id,
  });
  await createTask(ws1._id, webProject._id, webDone._id, 1, {
    title: 'Migrate to Tailwind CSS v4',
    priority: 'low',
    type: 'task',
    storyPoints: 2,
    epicId: perfEpic._id,
  });

  const { project: mobProject, columns: mobCols } = await createProject(
    ws1._id,
    'Mobile App',
    'MOB',
    '#F59E0B'
  );
  const [mobBacklog, mobTodo, mobProgress] = mobCols;

  const authEpic = await createEpic(mobProject._id, ws1._id, 'Secure Authentication', '#EF4444');

  await createTask(ws1._id, mobProject._id, mobBacklog._id, 0, {
    title: 'Spike: evaluate push notification providers',
    priority: 'low',
    type: 'spike',
    storyPoints: 2,
  });
  await createTask(ws1._id, mobProject._id, mobTodo._id, 0, {
    title: 'Implement biometric login',
    priority: 'high',
    type: 'story',
    storyPoints: 8,
    labels: [{ name: 'Security', color: '#EF4444' }],
    epicId: authEpic._id,
  });
  await createTask(ws1._id, mobProject._id, mobProgress._id, 0, {
    title: 'Crash on app launch (Android 14)',
    priority: 'urgent',
    type: 'bug',
    storyPoints: 3,
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
  });

  // ---------- Workspace 2: Marketing ----------
  const ws2 = await createWorkspace('Marketing');

  const { project: mktProject, columns: mktCols } = await createProject(
    ws2._id,
    'Q4 Campaign',
    'MKT',
    '#10B981'
  );
  const [mktBacklog, mktTodo, mktProgress, mktDone] = mktCols;

  const launchEpic = await createEpic(mktProject._id, ws2._id, 'Holiday Launch', '#F59E0B');

  await createTask(ws2._id, mktProject._id, mktBacklog._id, 0, {
    title: 'Brainstorm holiday campaign themes',
    priority: 'low',
    type: 'task',
    storyPoints: 2,
    epicId: launchEpic._id,
  });
  await createTask(ws2._id, mktProject._id, mktTodo._id, 0, {
    title: 'Write email newsletter copy',
    priority: 'medium',
    type: 'task',
    storyPoints: 3,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    epicId: launchEpic._id,
    checklist: [
      { text: 'Draft subject lines', done: true },
      { text: 'Body copy', done: false },
    ],
  });
  await createTask(ws2._id, mktProject._id, mktProgress._id, 0, {
    title: 'Design social media banner set',
    priority: 'high',
    type: 'task',
    storyPoints: 5,
    labels: [{ name: 'Design', color: '#8B5CF6' }],
    epicId: launchEpic._id,
  });
  await createTask(ws2._id, mktProject._id, mktDone._id, 0, {
    title: 'Finalize Q4 budget approval',
    priority: 'medium',
    type: 'task',
    storyPoints: 1,
  });

  const { project: socialProject, columns: socialCols } = await createProject(
    ws2._id,
    'Social Growth',
    'SOC',
    '#EC4899'
  );
  const [socBacklog, socTodo] = socialCols;

  await createTask(ws2._id, socialProject._id, socBacklog._id, 0, {
    title: 'Analyze competitor Instagram engagement',
    priority: 'low',
    type: 'task',
    storyPoints: 2,
  });
  await createTask(ws2._id, socialProject._id, socTodo._id, 0, {
    title: 'Plan influencer partnership outreach',
    priority: 'medium',
    type: 'task',
    storyPoints: 3,
  });

  console.log('[seed] Demo data created:');
  console.log('  - Workspace "Product Team" → Website Redesign (6 tasks, 2 epics), Mobile App (3 tasks, 1 epic)');
  console.log('  - Workspace "Marketing" → Q4 Campaign (4 tasks, 1 epic), Social Growth (2 tasks)');
  console.log(`  - Owner: ${owner.email}`);

  await mongoose.disconnect();
  console.log('[seed] Done.');
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
