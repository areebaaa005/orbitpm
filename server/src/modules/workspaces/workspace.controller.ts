import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import * as workspaceService from './workspace.service';
import { recordAudit, userEmail } from '../audit/audit.service';
import { Workspace } from './workspace.model';
import { Membership } from './membership.model';

export const createWorkspace = catchAsync(async (req: Request, res: Response) => {
  const workspace = await workspaceService.createWorkspace(req.userId!, req.body.name);
  await recordAudit(req, {
    workspaceId: workspace._id.toString(),
    action: 'workspace.created',
    targetType: 'workspace',
    targetId: workspace._id.toString(),
    targetLabel: workspace.name,
  });
  res.status(201).json({ success: true, data: { workspace } });
});

export const getMyMembership = catchAsync(async (req: Request, res: Response) => {
  const membership = await workspaceService.getMyMembership(req.params.workspaceId, req.userId!);
  res.status(200).json({ success: true, data: { role: membership.role } });
});

export const deleteWorkspace = catchAsync(async (req: Request, res: Response) => {
  const before = await Workspace.findById(req.params.workspaceId).select('name');
  await workspaceService.deleteWorkspace(req.params.workspaceId);
  await recordAudit(req, {
    workspaceId: req.params.workspaceId,
    action: 'workspace.deleted',
    targetType: 'workspace',
    targetId: req.params.workspaceId,
    targetLabel: before?.name,
  });
  res.status(200).json({ success: true, data: null });
});

export const updateWorkspace = catchAsync(async (req: Request, res: Response) => {
  const before = await Workspace.findById(req.params.workspaceId).select('name');
  const workspace = await workspaceService.updateWorkspace(req.params.workspaceId, req.body);
  if (before && before.name !== workspace.name) {
    await recordAudit(req, {
      workspaceId: req.params.workspaceId,
      action: 'workspace.renamed',
      targetType: 'workspace',
      targetId: req.params.workspaceId,
      targetLabel: workspace.name,
      metadata: { from: before.name, to: workspace.name },
    });
  }
  res.status(200).json({ success: true, data: { workspace } });
});

export const listWorkspaces = catchAsync(async (req: Request, res: Response) => {
  const workspaces = await workspaceService.listUserWorkspaces(req.userId!);
  res.status(200).json({ success: true, data: { workspaces } });
});

export const listMembers = catchAsync(async (req: Request, res: Response) => {
  const members = await workspaceService.listMembers(req.params.workspaceId);
  res.status(200).json({ success: true, data: { members } });
});

export const inviteMember = catchAsync(async (req: Request, res: Response) => {
  const { invitation, emailSent } = await workspaceService.createInvitation(
    req.params.workspaceId,
    req.userId!,
    req.body.email,
    req.body.role
  );
  await recordAudit(req, {
    workspaceId: req.params.workspaceId,
    action: 'member.invited',
    targetType: 'invitation',
    targetLabel: invitation.email,
    metadata: { role: invitation.role },
  });
  res.status(201).json({
    success: true,
    data: {
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        emailSent,
        // Fallback for when no email provider is set up, or the email doesn't arrive.
        token: invitation.token,
      },
    },
  });
});

export const previewInvitation = catchAsync(async (req: Request, res: Response) => {
  const result = await workspaceService.previewInvitation(req.query.token as string);
  res.status(200).json({ success: true, data: result });
});

export const acceptInvitation = catchAsync(async (req: Request, res: Response) => {
  const workspaceId = await workspaceService.acceptInvitation(req.userId!, req.body.token);
  await recordAudit(req, {
    workspaceId: String(workspaceId),
    action: 'member.joined',
    targetType: 'member',
    targetId: req.userId!,
    targetLabel: await userEmail(req.userId!),
  });
  res.status(200).json({ success: true, data: { workspaceId } });
});

export const updateMemberRole = catchAsync(async (req: Request, res: Response) => {
  const before = await Membership.findOne({ workspaceId: req.params.workspaceId, userId: req.params.userId }).select('role');
  const membership = await workspaceService.updateMemberRole(
    req.params.workspaceId,
    req.params.userId,
    req.body.role,
    req.membership!.role
  );
  await recordAudit(req, {
    workspaceId: req.params.workspaceId,
    action: 'member.role_changed',
    targetType: 'member',
    targetId: req.params.userId,
    targetLabel: await userEmail(req.params.userId),
    metadata: { from: before?.role, to: membership.role },
  });
  res.status(200).json({ success: true, data: { membership } });
});

export const removeMember = catchAsync(async (req: Request, res: Response) => {
  const label = await userEmail(req.params.userId);
  await workspaceService.removeMember(req.params.workspaceId, req.params.userId);
  await recordAudit(req, {
    workspaceId: req.params.workspaceId,
    action: 'member.removed',
    targetType: 'member',
    targetId: req.params.userId,
    targetLabel: label,
  });
  res.status(200).json({ success: true, data: null });
});
