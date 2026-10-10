import express from 'express';
import { listRoles, roleMatches } from '../controllers/roleController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

router.get('/', listRoles);
router.get('/matches', requireAuth, roleMatches);

export default router;
