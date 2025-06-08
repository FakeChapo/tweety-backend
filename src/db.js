/**
 * @file db.js
 * @description Handles SQLite database connection and schema application.
 * Exports an object with initialized database instance and query helpers.
 */

import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs/promises";
import config from "./config.js";

const DB_FILE = config.DB_FILE;
const SCHEMA_FILE = config.SCHEMA_FILE;

let dbInstance = null;
let dbPromise = null;

/**
 * Opens SQLite database and applies schema if necessary.
 * @returns {Promise<sqlite3.Database>}
 */
async function init(dbFile) {
    if (dbInstance) {
        return dbInstance;
    }

    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = (async () => {
        try {
            // Open database connection
            const connection = await open({
                filename: dbFile || DB_FILE,
                driver: sqlite3.Database
            });

            // Always ensure foreign keys enabled & schema applied once
            const schemaSql = await fs.readFile(SCHEMA_FILE, "utf-8");
            await connection.exec(schemaSql);

            dbInstance = connection;
            return dbInstance;
        } catch (err) {
            // On error, clear so future calls can retry
            dbPromise = null;
            console.error("[DB] Failed to open or initialize database:", err);
            throw err;
        }
    })();

    return dbPromise;
}

/**
 * Gets the current database instance after initialization.
 * @returns {sqlite3.Database}
 */
function getDb() {
    if (!dbInstance) {
        throw new Error("Database not initialized. Call init() first.");
    }
    return dbInstance;
}

export default {
    init,
    getDb
};
