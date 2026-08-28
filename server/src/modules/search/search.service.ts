import { Task } from '../tasks/task.model';
import { Project } from '../projects/project.model';

export async function searchWorkspace(workspaceId: string, query: string) {
  if (!query || query.trim().length < 2) {
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
      name: { $regex: query, $options: 'i' },
    })
      .select('name key color')
      .limit(10),
  ]);

  return { tasks, projects };
}
