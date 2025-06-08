/**
 * @file routes/v1.js
 * @description Main v1 API router. Mounts /auth, /events, and /poznan routers for versioned API endpoints.
 */

import express from "express";
import authRouter from "./v1/auth.js";
import eventsRouter from "./v1/events.js";
import poznanRouter from "./v1/poznan.js";

const router = express.Router();

/**
 * Mount /auth routes (registration, login, user info).
 */
router.use("/auth", authRouter);

/**
 * Mount /events routes (public: get all, get by id, filter; protected: add new).
 */
router.use("/events", eventsRouter);

/**
 * Mount /poznan routes (poznan API proxy with cache).
 */
router.use("/poznan", poznanRouter);

export default router;
