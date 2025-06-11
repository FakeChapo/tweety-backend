/**
 * @file routes/v1/events.js
 * @description Events endpoints (public read, authenticated create, like/dislike).
 */

import express from "express";
import {
    eventCreateSchema,
    eventQuerySchema,
} from "../../utils/validators.js";
import {
    createEvent,
    getEventById,
    getEvents,
    likeOrDislikeEvent,
    getEventReactions
} from "../../models/eventModel.js";
import { authenticateJWT } from "../../middleware/auth.js";

/**
 * Express router for /v1/events
 */
const router = express.Router();

/**
 * GET /v1/events
 * Public: Get all events, optionally filtered by type and timestamp (returns events up to 3 days prior to timestamp).
 * Query: ?type=TYPE×tamp=ISO8601
 */
router.get("/", async (req, res, next) => {
    try {
        const { error, value } = eventQuerySchema.validate(req.query, { abortEarly: false });
        if (error) {
            return res.status(400).json({ error: "Invalid query params", details: error.details.map(e => e.message) });
        }

        const events = await getEvents({
            type: value.type,
            timestamp: value.timestamp
        });

        res.json({events});
    } catch (err) {
        next(err);
    }
});

/**
 * GET /v1/events/:id
 * Public: Get event details by id.
 */
router.get("/:id", async (req, res, next) => {
    try {
        const event = await getEventById(req.params.id);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        res.json(event);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /v1/events
 * Authenticated: Add a new event.
 */
router.post("/", authenticateJWT, async (req, res, next) => {
    try {
        const { error, value } = eventCreateSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ error: "Validation failed", details: error.details.map(e => e.message) });
        }

        const createdBy = req.user?.id || null;
        const event = await createEvent(value, createdBy);

        res.status(201).json(event);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /v1/events/:id/like
 * Authenticated: Like an event.
 */
router.post("/:id/like", authenticateJWT, async (req, res, next) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        /** @type {import("../../models/eventModel.js").LikeDislikeResult} */
        const result = await likeOrDislikeEvent(eventId, userId, 1);

        if (!result.eventExists) {
            return res.status(404).json({ error: "Event not found" });
        }

        const reactions = await getEventReactions(eventId);

        res.json({
            message: result.updated ? "Reaction updated" : "Reaction registered",
            likes: reactions.likes,
            dislikes: reactions.dislikes
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /v1/events/:id/dislike
 * Authenticated: Dislike an event.
 */
router.post("/:id/dislike", authenticateJWT, async (req, res, next) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        /** @type {import("../../models/eventModel.js").LikeDislikeResult} */
        const result = await likeOrDislikeEvent(eventId, userId, -1);

        if (!result.eventExists) {
            return res.status(404).json({ error: "Event not found" });
        }

        const reactions = await getEventReactions(eventId);

        res.json({
            message: result.updated ? "Reaction updated" : "Reaction registered",
            likes: reactions.likes,
            dislikes: reactions.dislikes
        });
    } catch (err) {
        next(err);
    }
});

export default router;
