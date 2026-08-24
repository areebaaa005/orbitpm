import { Comment } from './comment.model';
import { Task } from '../tasks/task.model';
import { ApiError } from '../../utils/ApiError';
import { logActivity } from '../activities/activity.service';
import { createNotification } from '../notifications/notification.service';
import { emitToProject } from '../../config/socket';
import { User } from '../users/user.model';

export async function createComment(
  taskId: string,
  authorId: string,
  input: { body: string; mentions?: string[] }
) {
  const task = await Task.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');

  const comment = await Comment.create({
    taskId,
    workspaceId: task.workspaceId,
    authorId,
    body: input.body,
    mentions: input.mentions || [],
  });

  await logActivity({
    workspaceId: task.workspaceId.toString(),
    projectId: task.projectId.toString(),
    taskId,
    actorId: authorId,
    action: 'task_commented',
    metadata: { commentId: comment._id },
  });

  const populated = await comment.populate('authorId', 'name avatar');

  emitToProject(task.projectId.toString(), 'comment:created', populated);

  // Notify mentioned users (except the author mentioning themself)
  if (input.mentions?.length) {
    const author = await User.findById(authorId).select('name');
    for (const mentionedUserId of input.mentions) {
      if (mentionedUserId === authorId) continue;
      await createNotification({
        userId: mentionedUserId,
        type: 'mention',
        workspaceId: task.workspaceId.toString(),
        taskId,
        actorId: authorId,
        message: `${author?.name || 'Someone'} mentioned you in "${task.title}"`,
      });
    }
  }

  return populated;
}

export async function listComments(taskId: string) {
  return Comment.find({ taskId }).sort({ createdAt: 1 }).populate('authorId', 'name avatar');
}

export async function deleteComment(commentId: string, requesterId: string) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound('Comment not found');
  if (comment.authorId.toString() !== requesterId) {
    throw ApiError.forbidden('You can only delete your own comments');
  }
  await comment.deleteOne();
}
