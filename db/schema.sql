-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- USER TOKENS TABLE (for multi-device login, JWT reference)
CREATE TABLE IF NOT EXISTS user_tokens (
    id TEXT PRIMARY KEY,           -- UUID for this token entry
    user_id TEXT NOT NULL,         -- references users.id (not enforced FK for flexibility)
    token TEXT NOT NULL,           -- the JWT or a unique identifier
    expires_at TEXT NOT NULL,      -- ISO timestamp
    issued_at TEXT NOT NULL,       -- ISO timestamp
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- EVENTS TABLE (public, anyone can read)
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    stopId TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    timestamp TEXT NOT NULL,       -- ISO 8601 string, set by JS
    created_by TEXT,               -- user id who created event (optional)
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for quick event lookup by type and timestamp
CREATE INDEX IF NOT EXISTS idx_events_type_timestamp ON events(type, timestamp);

-- EVENT LIKES/DISLIKES TABLE
CREATE TABLE IF NOT EXISTS event_likes (
    id TEXT PRIMARY KEY,            -- UUID for this like/dislike
    event_id TEXT NOT NULL,         -- references events.id
    user_id TEXT NOT NULL,          -- references users.id
    reaction INTEGER NOT NULL,      -- 1 = like, -1 = dislike
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)       -- Only one reaction per user per event
);

-- Index for fast lookup of likes/dislikes per event
CREATE INDEX IF NOT EXISTS idx_event_likes_event_id ON event_likes(event_id);

-- Index for fast lookup of likes/dislikes per user
CREATE INDEX IF NOT EXISTS idx_event_likes_user_id ON event_likes(user_id);
