-- db/schema.sql

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- USER TOKENS TABLE (for multi-device login, JWT reference)
CREATE TABLE IF NOT EXISTS user_tokens (
    id TEXT PRIMARY KEY,           -- UUID for this token entry
    user_id TEXT NOT NULL,         -- references users.id (not enforced FK for flexibility)
    token TEXT NOT NULL,           -- the JWT or a unique identifier
    expires_at TEXT NOT NULL,      -- ISO timestamp
    issued_at TEXT NOT NULL,       -- ISO timestamp
    device_info TEXT,              -- optional: user agent or device description
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- EVENTS TABLE (public, anyone can read)
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    otherName TEXT NOT NULL,
    otherId TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    timestamp TEXT NOT NULL,       -- ISO 8601 string, set by JS
    created_by TEXT,               -- user id who created event (optional)
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for quick event lookup by type and timestamp
CREATE INDEX IF NOT EXISTS idx_events_type_timestamp ON events(type, timestamp);
