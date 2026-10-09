import express from 'express';
import {
    getSkillProfile,
    saveSkillProfile
} from '../controllers/skillProfileController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateBody.js';
import { skillProfileSchema } from '../utils/skillProfileSchemas.js';

const router = express.Router();

router.use(requireAuth);

router.get('/profile', getSkillProfile);
router.put('/profile', validateBody(skillProfileSchema), saveSkillProfile);

export default router;
