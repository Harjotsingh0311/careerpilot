import { z } from 'zod';
import { validateBody } from '../middleware/validateBody.js';
import {
    analyzeResumeAgainstJd,
    deleteAllDocuments,
    deleteDocument,
    DocumentError,
    extractFromFile,
    getDocument,
    listDocuments,
    processDocument
} from '../services/documentPipelineService.js';

export const documentTextSchema = z.object({
    kind: z.enum(['resume', 'jd']),
    name: z.string().trim().min(1).max(180).optional(),
    text: z.string().trim().min(200).max(20000)
});

export const analyzeDocumentsSchema = z.object({
    resumeId: z.string().regex(/^[a-f\d]{24}$/i),
    jdId: z.string().regex(/^[a-f\d]{24}$/i)
});

export const validateDocumentText = validateBody(documentTextSchema);
export const validateAnalyzeDocuments = validateBody(analyzeDocumentsSchema);

function handleError(error, res, next) {
    if (error instanceof DocumentError ||
        (Number.isInteger(error.status) && error.code)) {
        return res.status(error.status).json({
            ok: false,
            error: {
                code: error.code,
                message: error.message
            }
        });
    }

    return next(error);
}

export async function uploadDocument(req, res, next) {
    try {
        const kind = req.body?.kind;

        if (!['resume', 'jd'].includes(kind)) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'INVALID_DOCUMENT_KIND',
                    message: 'Include kind=resume or kind=jd with the file.'
                }
            });
        }

        if (!req.file) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'FILE_REQUIRED',
                    message: 'Select a PDF or DOCX file to upload.'
                }
            });
        }

        const text = await extractFromFile(req.file);

        const result = await processDocument({
            userId: req.auth.userId,
            kind,
            name: req.file.originalname,
            text
        });

        return res.status(201).json({ ok: true, data: result });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function submitDocumentText(req, res, next) {
    try {
        const result = await processDocument({
            userId: req.auth.userId,
            kind: req.body.kind,
            name: req.body.name || (
                req.body.kind === 'jd'
                    ? 'Pasted job description'
                    : 'Pasted resume'
            ),
            text: req.body.text
        });

        return res.status(201).json({ ok: true, data: result });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function listMyDocuments(req, res, next) {
    try {
        const documents = await listDocuments(req.auth.userId);
        return res.status(200).json({
            ok: true,
            data: { documents }
        });
    } catch (error) {
        next(error);
    }
}

export async function getMyDocument(req, res, next) {
    try {
        const document = await getDocument(req.auth.userId, req.params.id);
        return res.status(200).json({
            ok: true,
            data: { document }
        });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function deleteMyDocument(req, res, next) {
    try {
        const result = await deleteDocument(
            req.auth.userId,
            req.params.id
        );

        return res.status(200).json({
            ok: true,
            data: result
        });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function deleteMyDocumentData(req, res, next) {
    try {
        const result = await deleteAllDocuments(req.auth.userId);

        return res.status(200).json({
            ok: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function analyzeDocuments(req, res, next) {
    try {
        const result = await analyzeResumeAgainstJd(
            req.auth.userId,
            req.body.resumeId,
            req.body.jdId
        );

        return res.status(200).json({
            ok: true,
            data: { analysis: result }
        });
    } catch (error) {
        return handleError(error, res, next);
    }
}
