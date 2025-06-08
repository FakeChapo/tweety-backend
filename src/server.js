/**
 * @file server.js
 * @description Main server entry point for the RESTful API using Express.
 * Loads environment, initializes database, sets up middleware, mounts routers, and starts the server.
 */

import express from "express";
import dotenv from "dotenv";
import db from "./db.js";
import v1Router from "./routes/v1.js";
import errorHandler from "./middleware/errorHandler.js";
import config from "./config.js";
import morgan from "morgan";

// Load environment variables from .env
dotenv.config();

// Configurable port (default 3000)
const PORT = config.PORT;

// Initialize Express app
const app = express();

// Request logging
app.use(morgan("dev"));

// Middleware: JSON body parser
app.use(express.json());

// Mount v1 API router
app.use("/v1", v1Router);

// Health check endpoint
app.get("/", (req, res) => {
    res.status(200).json({ status: "ok", message: "API is running." });
});

// Central error handler (should be last)
app.use(errorHandler);

let isStartedByTest = false;

/**
 * Starts the server only after DB is ready.
 * @returns {Promise<express.Express>}
 */
export async function startServer() {
    await db.init();
    if (!isStartedByTest) {
        app.listen(config.PORT, () => {
            console.log(`Server listening on port ${config.PORT}`);
        });
    }
    return app;
}

/**
 * Export the app instance for testing (so supertest can use it without listening).
 */
export default app;

// Start server if not in test mode (i.e., started directly)
if (process.env.NODE_ENV !== "test") {
    startServer();
} else {
    isStartedByTest = true;
}