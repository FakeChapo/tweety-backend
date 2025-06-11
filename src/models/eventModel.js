/**
 * @file models/eventModel.js
 * @description Event model: handles event-related database operations.
 */

import { v4 as uuidv4 } from "uuid";
import db from "../db.js";

/**
 * Creates a new event in the database.
 * @param {object} eventData - The event data.
 * @param {string} eventData.stopId
 * @param {string} eventData.type
 * @param {string} eventData.description
 * @param {string|null} createdBy - User ID of the creator (nullable).
 * @returns {Promise<object>} The created event.
 */
export async function createEvent(eventData, createdBy = null) {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();
    const dbInstance = db.getDb();

    await dbInstance.run(
        "INSERT INTO events (id, stopId, type, description, timestamp, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        eventId,
        eventData.stopId,
        eventData.type,
        eventData.description,
        timestamp,
        createdBy
    );

    return {
        id: eventId,
        ...eventData,
        timestamp: timestamp,
        created_by: createdBy,
        likes: 0,
        dislikes: 0
    };
}

/**
 * Gets a single event by its ID.
 * @param {string} eventId
 * @returns {Promise<object|null>}
 */
export async function getEventById(eventId) {
    const dbInstance = db.getDb();
    const event = await dbInstance.get(
        "SELECT * FROM events WHERE id = ?",
        eventId
    );

    if (!event) {
        return null;
    }

    const reaction = await getEventReactions(eventId);

    return {
        id: event.id,
        stopId: event.stopId,
        type: event.type,
        description: event.description,
        timestamp: new Date(event.timestamp).getTime(),
        likes: reaction.likes,
        dislikes: reaction.dislikes
    };
}


/**
 * Gets all events, with optional filtering by type and up to a timestamp (max 3 days back).
 * Each event includes its like/dislike stats.
 * @param {object} [options]
 * @param {string} [options.type]
 * @param {string} [options.timestamp] - ISO date string; returns events within 3 days before this timestamp.
 * @returns {Promise<object[]>}
 */
export async function getEvents(options = {}) {
    const dbInstance = db.getDb();
    let query = "SELECT * FROM events WHERE 1=1";
    const params = [];

    if (options.type) {
        query += " AND type = ?";
        params.push(options.type);
    }

    if (options.timestamp) {
        const first = new Date(parseInt(options.timestamp));
        const second = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const timestamp = first.getTime() > second.getTime() ? first : second;
        query += " AND timestamp >= ?";
        params.push(timestamp.toISOString());
    } else {
        const timestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        query += " AND timestamp >= ?";
        params.push(timestamp.toISOString());
    }

    query += " ORDER BY timestamp DESC";

    const events = await dbInstance.all(query, ...params);

    // Get all event IDs
    const eventIds = events.map(event => event.id);

    // Get all reactions in one query
    const reactionsMap = await getEventsReactions(eventIds);

    // Map events with their reactions
    return events.map(event => {
        const reaction = reactionsMap[event.id] || { likes: 0, dislikes: 0 };
        return {
            id: event.id,
            stopId: event.stopId,
            type: event.type,
            description: event.description,
            timestamp: new Date(event.timestamp).getTime(),
            likes: reaction.likes,
            dislikes: reaction.dislikes
        };
    });
}

/**
 * Gets all events of a specific type.
 * @param {string} type
 * @returns {Promise<object[]>}
 */
export async function getEventsByType(type) {
    const dbInstance = db.getDb();
    return dbInstance.all(
        "SELECT * FROM events WHERE type = ? ORDER BY timestamp DESC",
        type
    );
}

/**
 * @typedef {Object} LikeDislikeResult
 * @property {boolean} eventExists - Whether the event exists.
 * @property {boolean} updated - Whether the reaction was updated (true) or inserted (false).
 */

/**
 * Like or dislike an event.
 * @param {string} eventId
 * @param {string} userId
 * @param {1|-1} reaction - 1 for like, -1 for dislike
 * @returns {Promise<LikeDislikeResult>}
 */
export async function likeOrDislikeEvent(eventId, userId, reaction) {
    const dbInstance = db.getDb();

    // Check if event exists
    const event = await dbInstance.get(
        "SELECT id FROM events WHERE id = ?",
        eventId
    );
    if (!event) {
        return { eventExists: false, updated: false };
    }

    // Check if user has already reacted
    const existing = await dbInstance.get(
        "SELECT id, reaction FROM event_likes WHERE event_id = ? AND user_id = ?",
        eventId,
        userId
    );

    if (!existing) {
        // Insert new reaction
        await dbInstance.run(
            "INSERT INTO event_likes (id, event_id, user_id, reaction, created_at) VALUES (?, ?, ?, ?, ?)",
            uuidv4(),
            eventId,
            userId,
            reaction,
            new Date().toISOString()
        );
        return { eventExists: true, updated: false };
    } else if (existing.reaction !== reaction) {
        // Update existing reaction
        await dbInstance.run(
            "UPDATE event_likes SET reaction = ?, created_at = ? WHERE id = ?",
            reaction,
            new Date().toISOString(),
            existing.id
        );
        return { eventExists: true, updated: true };
    } else {
        // Reaction already exists and is the same
        return { eventExists: true, updated: false };
    }
}

/**
 * Get like/dislike stats for an event.
 * @param {string} eventId
 * @returns {Promise<{likes: number, dislikes: number}>}
 */
export async function getEventReactions(eventId) {
    const dbInstance = db.getDb();
    const row = await dbInstance.get(
        `SELECT
            SUM(CASE WHEN reaction = 1 THEN 1 ELSE 0 END) AS likes,
            SUM(CASE WHEN reaction = -1 THEN 1 ELSE 0 END) AS dislikes
         FROM event_likes
         WHERE event_id = ?`,
         eventId
    );
    return {
        likes: row.likes || 0,
        dislikes: row.dislikes || 0
    };
}

/**
 * Get like/dislike stats for multiple events.
 * @param {string[]} eventIds - Array of event IDs.
 * @returns {Promise<Object.<string, {likes: number, dislikes: number}>>}
 *          An object mapping eventId to its {likes, dislikes} counts.
 */
export async function getEventsReactions(eventIds) {
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
        return {};
    }
    const dbInstance = db.getDb();

    // Create placeholders (?, ?, ...) for the IN clause
    const placeholders = eventIds.map(() => "?").join(", ");

    const rows = await dbInstance.all(
        `SELECT
            event_id,
            SUM(CASE WHEN reaction = 1 THEN 1 ELSE 0 END) AS likes,
            SUM(CASE WHEN reaction = -1 THEN 1 ELSE 0 END) AS dislikes
         FROM event_likes
         WHERE event_id IN (${placeholders})
         GROUP BY event_id`,
        ...eventIds
    );

    // Map: { eventId: {likes, dislikes} }
    const result = {};
    for (const id of eventIds) {
        result[id] = { likes: 0, dislikes: 0 };
    }
    for (const row of rows) {
        result[row.event_id] = {
            likes: row.likes || 0,
            dislikes: row.dislikes || 0
        };
    }
    return result;
}

