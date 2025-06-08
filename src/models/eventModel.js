/**
 * @file models/eventModel.js
 * @description Event model: handles event-related database operations.
 */

import { v4 as uuidv4 } from "uuid";
import db from "../db.js";

/**
 * Creates a new event in the database.
 * @param {object} eventData - The event data.
 * @param {string} eventData.otherName
 * @param {string} eventData.otherId
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
        `INSERT INTO events (id, otherName, otherId, type, description, timestamp, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        eventId,
        eventData.otherName,
        eventData.otherId,
        eventData.type,
        eventData.description,
        timestamp,
        createdBy
    );

    return {
        id: eventId,
        ...eventData,
        timestamp,
        created_by: createdBy
    };
}

/**
 * Gets a single event by its ID.
 * @param {string} eventId
 * @returns {Promise<object|null>}
 */
export async function getEventById(eventId) {
    const dbInstance = db.getDb();
    return dbInstance.get(
        `SELECT * FROM events WHERE id = ?`,
        eventId
    );
}

/**
 * Gets all events, with optional filtering by type and up to a timestamp (max 3 days back).
 * @param {object} [options]
 * @param {string} [options.type]
 * @param {string} [options.timestamp] - ISO date string; returns events within 3 days before this timestamp.
 * @returns {Promise<object[]>}
 */
export async function getEvents(options = {}) {
    const dbInstance = db.getDb();
    let query = `SELECT * FROM events WHERE 1=1`;
    const params = [];

    if (options.type) {
        query += ` AND type = ?`;
        params.push(options.type);
    }

    if (options.timestamp) {
        // Only include events where timestamp >= (timestamp - 3 days) and <= timestamp
        const maxTimestamp = new Date(options.timestamp);
        const minTimestamp = new Date(maxTimestamp.getTime() - 3 * 24 * 60 * 60 * 1000);
        query += ` AND timestamp >= ? AND timestamp <= ?`;
        params.push(minTimestamp.toISOString(), maxTimestamp.toISOString());
    }

    query += ` ORDER BY timestamp DESC`;

    return dbInstance.all(query, ...params);
}

/**
 * Gets all events of a specific type.
 * @param {string} type
 * @returns {Promise<object[]>}
 */
export async function getEventsByType(type) {
    const dbInstance = db.getDb();
    return dbInstance.all(
        `SELECT * FROM events WHERE type = ? ORDER BY timestamp DESC`,
        type
    );
}
