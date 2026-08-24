import { generateContent, extractJson } from './gemini.client';
import { Task } from '../tasks/task.model';
import { Project } from '../projects/project.model';
import { Column } from '../projects/column.model';
import { ApiError } from '../../utils/ApiError';

const MAX_SUBTASKS = 6;

export async function suggestSubtasks(taskId: string) {
  const task = await Task.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');

  const prompt = `You are a project management assistant. Break the following task into ${MAX_SUBTASKS} or fewer concrete, actionable subtasks.

Task title: "${task.title}"
Task description: "${task.description || 'No description provided.'}"

Respond with ONLY a JSON array of short subtask title strings, nothing else. Example format:
["Subtask one", "Subtask two", "Subtask three"]`;

  const raw = await generateContent(prompt);
  const subtasks = extractJson<string[]>(raw);

  if (!Array.isArray(subtasks)) {
    throw ApiError.internal('AI response was not in the expected format');
  }

  // These are suggestions only — nothing is written to the database here.
  // The client shows them for the user to review and confirm individually.
  return subtasks
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .slice(0, MAX_SUBTASKS)
    .map((s) => s.trim());
}

export async function summarizeProject(projectId: string) {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const [tasks, doneColumns] = await Promise.all([
    Task.find({ projectId })
      .select('title priority dueDate columnId updatedAt')
      .sort({ updatedAt: -1 })
      .limit(40),
    Column.find({ projectId, name: { $regex: /^done$/i } }).select('_id'),
  ]);

  const doneColumnIds = new Set(doneColumns.map((c) => c._id.toString()));
  const now = new Date();

  const done = tasks.filter((t) => doneColumnIds.has(t.columnId.toString()));
  const overdue = tasks.filter(
    (t) => t.dueDate && t.dueDate < now && !doneColumnIds.has(t.columnId.toString())
  );
  const inProgress = tasks.filter(
    (t) => !doneColumnIds.has(t.columnId.toString()) && !overdue.includes(t)
  );

  // Only titles and counts are sent to the model — no descriptions,
  // comments, or user identities, to keep the AI context minimal.
  const prompt = `You are a project status assistant. Based on this data, write a concise status update in three short sections: Done, Blocked/Overdue, Next. Keep it under 120 words total, plain text, no markdown headers beyond simple labels.

Project: "${project.name}"
Recently completed (${done.length}): ${done.slice(0, 8).map((t) => t.title).join('; ') || 'none'}
Overdue (${overdue.length}): ${overdue.slice(0, 8).map((t) => t.title).join('; ') || 'none'}
In progress (${inProgress.length}): ${inProgress.slice(0, 8).map((t) => t.title).join('; ') || 'none'}`;

  const summary = await generateContent(prompt);
  return { summary: summary.trim() };
}
