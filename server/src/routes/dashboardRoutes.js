import express from 'express';
import { summary, trends } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

router.use(requireAuth);
router.get('/summary', summary);
router.get('/trends', trends);

export default router;
