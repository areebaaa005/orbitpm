import { Task } from '../tasks/task.model';
import { Project } from '../projects/project.model';
import { escapeRegex } from '../../utils/escapeRegex';

export async function searchWorkspace(workspaceId: string, rawQuery: unknown) {
  // ?q=a&q=b arrives as an array; anything that is not a plain string is treated as empty
  const query = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 100) : '';
  if (query.length < 2) {
    return { tasks: [], projects: [] };
  }

  const [tasks, projects] = await Promise.all([
    Task.find({ workspaceId, $text: { $search: query } })
      .select('title priority type projectId columnId')
      .limit(15)
      .populate('projectId', 'name key color'),
    Project.find({
      workspaceId,
      status: 'active',
      name: { $regex: escapeRegex(query), $options: 'i' },
    })
      .select('name key color')
      .limit(10),
  ]);

  return { tasks, projects };
}
