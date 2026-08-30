import crypto from 'crypto';
import { Workspace } from './workspace.model';
import { Membership, WorkspaceRole } from './membership.model';
import { Invitation } from './invitation.model';
import { User } from '../users/user.model';
import { Project } from '../projects/project.model';
import { Column } from '../projects/column.model';
import { Task } from '../tasks/task.model';
import { Comment } from '../comments/comment.model';
import { Activity } from '../activities/activity.model';
import { Notification } from '../notifications/notification.model';
import { Epic } from '../epics/epic.model';
import { Sprint } from '../sprints/sprint.model';
import { ApiError } from '../../utils/ApiError';
import { sendInvitationEmail } from '../../utils/email';
import { env } from '../../config/env';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'workspace'}-${suffix}`;
}

export async function createWorkspace(userId: string, name: string) {
  const workspace = await Workspace.create({
    name,
    slug: slugify(name),
    ownerId: userId,
  });

  await Membership.create({
    workspaceId: workspace._id,
    userId,
    role: 'owner',
  });

  return workspace;
}

export async function listUserWorkspaces(userId: string) {
  const memberships = await Membership.find({ userId }).populate('workspaceId');
  return memberships.map((m) => ({
    workspace: m.workspaceId,
    role: m.role,
  }));
}

export async function listMembers(workspaceId: string) {
  const memberships = await Membership.find({ workspaceId }).populate(
    'userId',
    'name email avatar'
  );
  return memberships.map((m) => ({
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

export async function createInvitation(
  workspaceId: string,
  invitedBy: string,
  email: string,
  role: WorkspaceRole
) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const existingMembership = await Membership.findOne({
      workspaceId,
      userId: existingUser._id,
    });
    if (existingMembership) {
      throw ApiError.conflict('This user is already a member of the workspace');
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await Invitation.create({
    workspaceId,
    email,
    role,
    token,
    invitedBy,
    expiresAt,
  });

  const [workspace, inviter] = await Promise.all([
    Workspace.findById(workspaceId).select('name'),
    User.findById(invitedBy).select('name'),
  ]);

  const emailResult = await sendInvitationEmail({
    to: email,
    workspaceName: workspace?.name || 'a workspace',
    role,
    inviterName: inviter?.name || 'Someone',
    inviteLink: `${env.clientUrl}/accept-invite?token=${token}`,
  });

  // The token is still returned so tests and the UI have a manual fallback
  // (e.g. if the email lands in spam or no email provider is configured).
  return { invitation, emailSent: emailResult.sent };
}

export async function previewInvitation(token: string) {
  const invitation = await Invitation.findOne({ token }).populate('workspaceId', 'name');
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    throw ApiError.badRequest('INVALID_INVITATION', 'This invitation is invalid or has expired');
  }
  return {
    email: invitation.email,
    role: invitation.role,
    workspaceName: (invitation.workspaceId as any)?.name || 'a workspace',
  };
}

export async function acceptInvitation(userId: string, token: string) {
  const invitation = await Invitation.findOne({ token });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    throw ApiError.badRequest('INVALID_INVITATION', 'This invitation is invalid or has expired');
  }

  const user = await User.findById(userId);
  if (!user || user.email !== invitation.email) {
    throw ApiError.forbidden('This invitation was issued to a different email address');
  }

  const existing = await Membership.findOne({ workspaceId: invitation.workspaceId, userId });
  if (existing) {
    throw ApiError.conflict('You are already a member of this workspace');
  }

  // Role comes from the stored invitation record, never from client input —
  // this is what stops a user from granting themselves elevated access.
  await Membership.create({
    workspaceId: invitation.workspaceId,
    userId,
    role: invitation.role,
  });

  invitation.acceptedAt = new Date();
  await invitation.save();

  return invitation.workspaceId;
}

export async function deleteWorkspace(workspaceId: string) {
  const projects = await Project.find({ workspaceId }).select('_id');
  const projectIds = projects.map((p) => p._id);

  await Promise.all([
    Column.deleteMany({ projectId: { $in: projectIds } }),
    Project.deleteMany({ workspaceId }),
    Task.deleteMany({ workspaceId }),
    Comment.deleteMany({ workspaceId }),
    Activity.deleteMany({ workspaceId }),
    Notification.deleteMany({ workspaceId }),
    Epic.deleteMany({ workspaceId }),
    Sprint.deleteMany({ workspaceId }),
    Membership.deleteMany({ workspaceId }),
    Invitation.deleteMany({ workspaceId }),
  ]);

  await Workspace.findByIdAndDelete(workspaceId);
}

export async function getMyMembership(workspaceId: string, userId: string) {
  const membership = await Membership.findOne({ workspaceId, userId });
  if (!membership) throw ApiError.forbidden('You are not a member of this workspace');
  return membership;
}

export async function updateWorkspace(workspaceId: string, updates: { name?: string }) {
  const workspace = await Workspace.findByIdAndUpdate(workspaceId, updates, { new: true });
  if (!workspace) {
    throw ApiError.notFound('Workspace not found');
  }
  return workspace;
}

export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  newRole: WorkspaceRole,
  actingRole: WorkspaceRole
) {
  const target = await Membership.findOne({ workspaceId, userId: targetUserId });
  if (!target) {
    throw ApiError.notFound('This user is not a member of the workspace');
  }
  if (target.role === 'owner') {
    throw ApiError.forbidden('The workspace owner role cannot be changed here');
  }
  if (newRole === 'owner') {
    throw ApiError.forbidden('Ownership must be transferred explicitly, not set via role update');
  }
  target.role = newRole;
  await target.save();
  return target;
}

export async function removeMember(workspaceId: string, targetUserId: string) {
  const target = await Membership.findOne({ workspaceId, userId: targetUserId });
  if (!target) {
    throw ApiError.notFound('This user is not a member of the workspace');
  }
  if (target.role === 'owner') {
    throw ApiError.forbidden('The workspace owner cannot be removed');
  }
  await target.deleteOne();
}
