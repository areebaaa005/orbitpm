import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember, requireMinRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  acceptInvitationSchema,
  updateMemberRoleSchema,
} from './workspace.validation';
import * as workspaceController from './workspace.controller';

const router = Router();

// Public: lets the invite-accept page know who the invitation is for
// before the person is asked to log in — no auth required, since the
// person clicking it isn't authenticated yet.
router.get('/invitations/preview', workspaceController.previewInvitation);

router.use(requireAuth);

router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get('/', workspaceController.listWorkspaces);
router.post(
  '/invitations/accept',
  validate(acceptInvitationSchema),
  workspaceController.acceptInvitation
);

router.get(
  '/:workspaceId/me',
  requireWorkspaceMember(),
  workspaceController.getMyMembership
);

router.get(
  '/:workspaceId/members',
  requireWorkspaceMember(),
  workspaceController.listMembers
);

router.patch(
  '/:workspaceId',
  requireWorkspaceMember(),
  requireMinRole('admin'),
  validate(updateWorkspaceSchema),
  workspaceController.updateWorkspace
);

router.delete(
  '/:workspaceId',
  requireWorkspaceMember(),
  requireMinRole('owner'),
  workspaceController.deleteWorkspace
);

router.post(
  '/:workspaceId/invitations',
  requireWorkspaceMember(),
  requireMinRole('admin'),
  validate(inviteMemberSchema),
  workspaceController.inviteMember
);

router.patch(
  '/:workspaceId/members/:userId',
  requireWorkspaceMember(),
  requireMinRole('admin'),
  validate(updateMemberRoleSchema),
  workspaceController.updateMemberRole
);

router.delete(
  '/:workspaceId/members/:userId',
  requireWorkspaceMember(),
  requireMinRole('admin'),
  workspaceController.removeMember
);

export default router;
