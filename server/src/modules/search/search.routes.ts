import { Router, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/rbac';
import * as searchService from './search.service';

const router = Router({ mergeParams: true });
router.use(requireAuth, requireWorkspaceMember());

router.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const results = await searchService.searchWorkspace(
      req.params.workspaceId,
      (req.query.q as string) || ''
    );
    res.status(200).json({ success: true, data: results });
  })
);

export default router;
