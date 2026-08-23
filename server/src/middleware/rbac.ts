import { Request, Response, NextFunction } from 'express';
import { Membership, WorkspaceRole, ROLE_RANK } from '../modules/workspaces/membership.model';
import { ApiError } from '../utils/ApiError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      membership?: { role: WorkspaceRole; workspaceId: string };
    }
  }
}

/**
 * Loads the caller's membership for the workspace referenced in the route
 * (via :workspaceId, or resolved earlier onto req.workspaceId by a parent
 * loader e.g. project -> workspaceId). Rejects if not a member.
 */
export function requireWorkspaceMember() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const workspaceId = req.params.workspaceId || req.workspaceId;
    if (!workspaceId) {
      return next(ApiError.badRequest('MISSING_WORKSPACE', 'Workspace context is missing'));
    }

    const membership = await Membership.findOne({ workspaceId, userId: req.userId });
    if (!membership) {
      return next(ApiError.forbidden('You are not a member of this workspace'));
    }

    req.membership = { role: membership.role, workspaceId: workspaceId.toString() };
    next();
  };
}

/**
 * Must run AFTER requireWorkspaceMember(). Rejects if the caller's role
 * rank is below the minimum required rank for this action.
 */
export function requireMinRole(minRole: WorkspaceRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.membership) {
      return next(ApiError.internal('requireMinRole used without requireWorkspaceMember'));
    }
    if (ROLE_RANK[req.membership.role] < ROLE_RANK[minRole]) {
      return next(ApiError.forbidden(`This action requires the '${minRole}' role or higher`));
    }
    next();
  };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      workspaceId?: string;
    }
  }
}
