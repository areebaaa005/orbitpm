import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import * as workspaceService from './workspace.service';

export const createWorkspace = catchAsync(async (req: Request, res: Response) => {
  const workspace = await workspaceService.createWorkspace(req.userId!, req.body.name);
  res.status(201).json({ success: true, data: { workspace } });
});

export const getMyMembership = catchAsync(async (req: Request, res: Response) => {
  const membership = await workspaceService.getMyMembership(req.params.workspaceId, req.userId!);
  res.status(200).json({ success: true, data: { role: membership.role } });
});

export const updateWorkspace = catchAsync(async (req: Request, res: Response) => {
  const workspace = await workspaceService.updateWorkspace(req.params.workspaceId, req.body);
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
  const invitation = await workspaceService.createInvitation(
    req.params.workspaceId,
    req.userId!,
    req.body.email,
    req.body.role
  );
  res.status(201).json({
    success: true,
    data: {
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        // Dev-only convenience: exposes the token since there's no email provider yet.
        token: invitation.token,
      },
    },
  });
});

export const acceptInvitation = catchAsync(async (req: Request, res: Response) => {
  const workspaceId = await workspaceService.acceptInvitation(req.userId!, req.body.token);
  res.status(200).json({ success: true, data: { workspaceId } });
});

export const updateMemberRole = catchAsync(async (req: Request, res: Response) => {
  const membership = await workspaceService.updateMemberRole(
    req.params.workspaceId,
    req.params.userId,
    req.body.role,
    req.membership!.role
  );
  res.status(200).json({ success: true, data: { membership } });
});

export const removeMember = catchAsync(async (req: Request, res: Response) => {
  await workspaceService.removeMember(req.params.workspaceId, req.params.userId);
  res.status(200).json({ success: true, data: null });
});
