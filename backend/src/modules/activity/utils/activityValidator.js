const HttpError = require('../../../utils/httpError');

const ALLOWED_FIELDS = ['action', 'info'];

function validateCreateActivity(payload) {
    if(!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new HttpError(400, 'Body must be a JSON object.');
    }

    const unsupportedFields = Object.keys(payload).filter(
        (field) => !ALLOWED_FIELDS.includes(field)
    );

    if (unsupportedFields.length > 0) {
        throw new HttpError(400, 'Body contains unsupported fields.', { unsupportedFields });
    }

    if( typeof payload.action !== 'string' || !payload.action.trim() ) {
        throw new HttpError(400, '"action" is required and must be a non-empty string.');
    }

    const normalized = { action: payload.action.trim() };

    if (Object.hasOwn(payload, 'info')) {
        if (typeof payload.info !== 'string') {
            throw new HttpError(400, '"info" must be a string.');
        }

        normalized.info = payload.info.trim();
    }

    return normalized;
}
module.exports = {
    validateCreateActivity,
};