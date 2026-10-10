import express from 'express';
import { getMe, patchMe } from '../controllers/userController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateBody.js';
import { userProfilePatchSchema } from '../utils/userProfileSchemas.js';

const router = express.Router();

router.use(requireAuth);
router.get('/me', getMe);
router.patch('/me', validateBody(userProfilePatchSchema), patchMe);

export default router;
