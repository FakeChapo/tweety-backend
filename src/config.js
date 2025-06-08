/**
 * @file config.js
 * @description Loads and exports application configuration from environment variables.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env file if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
export const DB_FILE = process.env.DB_FILE || path.join(__dirname, "../db/database.sqlite")
export const SCHEMA_FILE = path.join(__dirname, "../db/schema.sql");
export const JWT_SECRET = process.env.JWT_SECRET || "";
export const POZNAN_API_URL = process.env.POZNAN_API_URL || "";
export const NODE_ENV = process.env.NODE_ENV || "development";

if (!JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.warn("Warning: JWT_SECRET is not set in environment. Authentication will fail.");
}

if (!POZNAN_API_URL) {
    // eslint-disable-next-line no-console
    console.warn("Warning: POZNAN_API_URL is not set. POZNAN API endpoint will not function correctly.");
}

export default {
    PORT,
    DB_FILE,
    SCHEMA_FILE,
    JWT_SECRET,
    POZNAN_API_URL,
    NODE_ENV
};
