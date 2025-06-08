/**
 * @file routes/v1/auth.js
 * @description Auth endpoints: registration, login, and current user info.
 */

import express from "express";
import {
    registerSchema,
    loginSchema,
} from "../../utils/validators.js";
import {
    createUser,
    findUserByUsernameOrEmail,
    findUserById,
    verifyPassword
} from "../../models/userModel.js";
import { generateAndStoreToken, authenticateJWT, revokeToken } from "../../middleware/auth.js";

/**
 * Express router for /v1/auth
 */
const router = express.Router();

/**
 * POST /v1/auth/register
 * Registers a new user.
 */
router.post("/register", async (req, res, next) => {
    try {
        const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ error: "Validation failed", details: error.details.map(e => e.message) });
        }

        // Check if username or email already exists
        const existing = await findUserByUsernameOrEmail(value.username) || await findUserByUsernameOrEmail(value.email);
        if (existing) {
            return res.status(409).json({ error: "Username or email already in use" });
        }

        const user = await createUser(value.username, value.email, value.password);

        res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /v1/auth/login
 * Logs in a user and returns a JWT token.
 */
router.post("/login", async (req, res, next) => {
    try {
        const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ error: "Validation failed", details: error.details.map(e => e.message) });
        }

        const user = await findUserByUsernameOrEmail(value.usernameOrEmail);
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const passwordMatch = await verifyPassword(value.password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Optionally record device info from User-Agent
        const deviceInfo = req.headers["user-agent"] || "";

        const token = await generateAndStoreToken(user.id, deviceInfo);

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /v1/auth/logout
 * Logs out the current session by revoking the JWT token.
 */
router.post("/logout", authenticateJWT, async (req, res, next) => {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
        if (!token) {
            return res.status(400).json({ error: "No token provided" });
        }
        await revokeToken(token);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /v1/auth/me
 * Gets the current authenticated user's profile.
 */
router.get("/me", authenticateJWT, async (req, res, next) => {
    try {
        const user = await findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at
        });
    } catch (err) {
        next(err);
    }
});

export default router;
