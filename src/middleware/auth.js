/**
 * @file middleware/auth.js
 * @description Middleware for JWT verification and helpers for generating/storing tokens.
 * Used to protect endpoints and expose user info in req.user.
 */

import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import db from "../db.js";
import config from "../config.js";

/**
 * Duration (in seconds) for token expiry: 7 days.
 * @type {number}
 */
const TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60;

/**
 * Generates a JWT, stores it in user_tokens table, and returns the token string.
 * @param {string} userId - User's ID.
 * @param {string} deviceInfo - Optional device info string.
 * @returns {Promise<string>} The JWT string.
 */
export async function generateAndStoreToken(userId, deviceInfo = "") {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + TOKEN_EXPIRES_IN;

    const tokenId = uuidv4();

    const payload = {
        sub: userId,
        jti: tokenId,
        iat: issuedAt,
        exp: expiresAt
    };

    if (!config.JWT_SECRET) {
        throw new Error("JWT_SECRET is not set in environment.");
    }
    const token = jwt.sign(payload, config.JWT_SECRET);

    // Store token in user_tokens table
    const dbInstance = db.getDb();
    await dbInstance.run(
        `INSERT INTO user_tokens (id, user_id, token, expires_at, issued_at)
         VALUES (?, ?, ?, ?, ?)`,
        tokenId,
        userId,
        token,
        new Date(expiresAt * 1000).toISOString(),
        new Date(issuedAt * 1000).toISOString()
    );

    return token;
}

/**
 * Express middleware to verify JWT in Authorization header.
 * Attaches user info to req.user if valid.
 * Responds with 401 if token is missing or invalid.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function authenticateJWT(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        if (!header.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid Authorization header" });
        }
        const token = header.split(" ")[1];
        const jwtSecret = process.env.JWT_SECRET;

        let payload;
        try {
            payload = jwt.verify(token, jwtSecret);
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        // Check token existence in user_tokens (for logout/device revocation support)
        const dbInstance = db.getDb();
        const tokenRow = await dbInstance.get(
            `SELECT user_id, expires_at FROM user_tokens WHERE id = ? AND token = ?`,
            payload.jti,
            token
        );
        if (!tokenRow) {
            return res.status(401).json({ error: "Token not recognized or revoked" });
        }

        // Attach user info to req.user
        req.user = {
            id: payload.sub
        };

        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Deletes a specific token from the user_tokens table (for logout).
 * @param {string} token - The JWT string.
 * @returns {Promise<void>}
 */
export async function revokeToken(token) {
    const dbInstance = db.getDb();
    await dbInstance.run(
        `DELETE FROM user_tokens WHERE token = ?`,
        token
    );
}
