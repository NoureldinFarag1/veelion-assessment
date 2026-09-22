const HttpError = require('../utils/httpError');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  // Malformed JSON from express.json(): the client's fault, but don't echo parser internals.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Invalid JSON body.' } });
  }

  const isClientError = error instanceof HttpError && error.statusCode < 500;
  const statusCode = isClientError ? error.statusCode : 500;

  const response = {
    error: {
      message: isClientError ? error.message : 'Internal server error',
    },
  };

  if (isClientError && error.details) {
    response.error.details = error.details;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;