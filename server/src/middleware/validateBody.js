export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Please check the supplied fields.',
                    details: result.error.issues.map(issue => ({
                        field: issue.path.join('.'),
                        message: issue.message
                    }))
                }
            });
        }

        req.body = result.data;
        next();
    };
}
