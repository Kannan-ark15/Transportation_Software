// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // PostgreSQL specific errors
    if (err.code) {
        switch (err.code) {
            case '23505': // Unique violation
                statusCode = 400;
                message = 'Duplicate entry: ' + (err.detail || 'Record already exists');
                break;
            case '23503': // Foreign key violation
                statusCode = 400;
                message = 'Foreign key constraint violation';
                break;
            case '23502': // Not null violation
                statusCode = 400;
                message = 'Required field missing: ' + (err.column || 'unknown');
                break;
            case '22P02': // Invalid text representation
                statusCode = 400;
                message = 'Invalid data format';
                break;
            case '42P01': // Undefined table
                statusCode = 500;
                message = 'Database table not found';
                break;
            default:
                statusCode = 500;
                message = 'Database error occurred';
        }
    }

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && {
            error: err.message,
            stack: err.stack
        })
    });
};

// 404 handler
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = { errorHandler, notFound };
