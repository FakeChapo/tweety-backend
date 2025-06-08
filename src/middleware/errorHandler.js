/**
 * @file middleware/errorHandler.js
 * @description Centralized error handler for Express.
 * Ensures all errors return a JSON `{ error, ... }` response.
 */

/**
 * Express error-handling middleware.
 * @param {Error} err - The error object.
 * @param {import("express").Request} req - The Express request object.
 * @param {import("express").Response} res - The Express response object.
 * @param {import("express").NextFunction} next - The Express next middleware function.
 */
export default function errorHandler(err, req, res, next) {
    // Default to 500 if not set
    const status = err.statusCode || err.status || 500;

    // Log error in development
    if (process.env.NODE_ENV !== "production") {
        console.error(err);
    }

    // Prepare error response object
    const response = {
        error: err.message || "Internal Server Error"
    };

    // Optionally include stack trace in development
    if (process.env.NODE_ENV !== "production" && err.stack) {
        response.stack = err.stack;
    }

    // Optionally include extra details if present
    if (err.details) {
        response.details = err.details;
    }

    res.status(status).json(response);
}
