import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { handleDocumentUpload } from '../middleware/upload.js';
import {
    analyzeDocuments,
    deleteMyDocument,
    deleteMyDocumentData,
    getMyDocument,
    listMyDocuments,
    submitDocumentText,
    uploadDocument,
    validateAnalyzeDocuments,
    validateDocumentText
} from '../controllers/documentController.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', handleDocumentUpload, uploadDocument);
router.post('/text', validateDocumentText, submitDocumentText);
router.post('/analyze', validateAnalyzeDocuments, analyzeDocuments);

router.get('/', listMyDocuments);
router.delete('/', deleteMyDocumentData);

router.get('/:id', getMyDocument);
router.delete('/:id', deleteMyDocument);

export default router;
