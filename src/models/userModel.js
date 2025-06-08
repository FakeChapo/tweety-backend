/**
 * @file models/userModel.js
 * @description User model: handles user-related database operations.
 */

import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import db from "../db.js";

/**
 * Creates a new user in the database.
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} The created user (without password_hash).
 */
export async function createUser(username, email, password) {
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const dbInstance = db.getDb();

    await dbInstance.run(
        `INSERT INTO users (id, username, email, password_hash, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        userId,
        username,
        email,
        passwordHash
    );

    return {
        id: userId,
        username,
        email
    };
}

/**
 * Finds a user by username or email.
 * @param {string} usernameOrEmail
 * @returns {Promise<object|null>} The user row or null.
 */
export async function findUserByUsernameOrEmail(usernameOrEmail) {
    const dbInstance = db.getDb();
    return dbInstance.get(
        `SELECT * FROM users WHERE username = ? OR email = ?`,
        usernameOrEmail,
        usernameOrEmail
    );
}

/**
 * Finds a user by id.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findUserById(userId) {
    const dbInstance = db.getDb();
    return dbInstance.get(
        `SELECT id, username, email, created_at FROM users WHERE id = ?`,
        userId
    );
}

/**
 * Compares a plain password to a user's hashed password.
 * @param {string} plainPassword
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
}
