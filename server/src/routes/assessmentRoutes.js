import express from 'express';
import {
    active,
    history,
    mastery,
    result,
    saveAnswers,
    start,
    submit
} from '../controllers/assessmentController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateBody.js';
import {
    saveAnswersSchema,
    startAssessmentSchema
} from '../utils/assessmentSchemas.js';

const router = express.Router();

router.use(requireAuth);

router.get('/tests/active', active);
router.post('/tests', validateBody(startAssessmentSchema), start);
router.put('/tests/:id/answers', validateBody(saveAnswersSchema), saveAnswers);
router.post('/tests/:id/submit', submit);
router.get('/tests/:id/result', result);
router.get('/history', history);
router.get('/mastery', mastery);

export default router;
