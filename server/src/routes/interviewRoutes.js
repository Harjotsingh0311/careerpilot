import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
    answerInterview,
    createInterview,
    getInterview,
    hintInterview,
    finishInterview,
    listInterviews,
    validateCreateInterview,
    validateInterviewAnswer
} from '../controllers/interviewController.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', validateCreateInterview, createInterview);
router.get('/', listInterviews);
router.get('/:id', getInterview);
router.post('/:id/answer', validateInterviewAnswer, answerInterview);
router.post('/:id/hint', hintInterview);
router.post('/:id/finish', finishInterview);

export default router;
