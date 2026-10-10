import multer from 'multer';

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    }
});

export function handleDocumentUpload(req, res, next) {
    upload.single('file')(req, res, error => {
        if (!error) return next();

        const sizeLimit = error instanceof multer.MulterError &&
            error.code === 'LIMIT_FILE_SIZE';

        return res.status(sizeLimit ? 413 : 400).json({
            ok: false,
            error: {
                code: sizeLimit ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
                message: sizeLimit
                    ? 'Files must be 5 MB or smaller.'
                    : 'The file upload could not be processed.'
            }
        });
    });
}
