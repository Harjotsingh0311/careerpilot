import multer from 'multer';

const supportedTypes = new Set([
    'audio/webm',
    'video/webm',
    'audio/mp4',
    'video/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/ogg'
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 8 * 1024 * 1024,
        files: 1,
        fields: 2,
        parts: 3
    },
    fileFilter(req, file, callback) {
        // Browser recordings may include parameters such as
        // "audio/webm;codecs=opus". Compare the base MIME type.
        const mimeType = String(file.mimetype || '')
            .split(';')[0]
            .trim()
            .toLowerCase();

        callback(null, supportedTypes.has(mimeType));
    }
});

export function handleVoiceUpload(req, res, next) {
    upload.single('audio')(req, res, error => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            const tooLarge = error.code === 'LIMIT_FILE_SIZE';

            return res.status(tooLarge ? 413 : 400).json({
                ok: false,
                error: {
                    code: tooLarge ? 'AUDIO_TOO_LARGE' : 'INVALID_AUDIO_UPLOAD',
                    message: tooLarge
                        ? 'Audio must be 8 MB or smaller. Please record a shorter answer.'
                        : 'Upload one supported audio recording at a time. Please retry with a single recording.'
                }
            });
        }

        return next(error);
    });
}
