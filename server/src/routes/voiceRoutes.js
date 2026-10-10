import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { handleVoiceUpload } from '../middleware/voiceUpload.js';
import { analyzeVoice } from '../controllers/voiceController.js';

const router = express.Router();

router.use(requireAuth);
router.post('/analyze', handleVoiceUpload, analyzeVoice);

export default router;
