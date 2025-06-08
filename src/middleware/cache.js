/**
 * @file middleware/cache.js
 * @description Simple in-memory TTL cache middleware for specific route(s).
 */

/**
 * Creates a cache middleware for GET requests.
 * @param {number} ttlMs - Time to live in milliseconds.
 * @returns {import("express").RequestHandler}
 */
export function createCache(ttlMs) {
    const cache = new Map();

    return (req, res, next) => {
        if (req.method !== "GET") {
            return next();
        }

        const key = req.originalUrl;

        if (cache.has(key)) {
            const { expires, value } = cache.get(key);
            if (Date.now() < expires) {
                return res.json(value);
            } else {
                cache.delete(key);
            }
        }

        // Monkey-patch res.json to store result in cache
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            cache.set(key, { expires: Date.now() + ttlMs, value: body });
            return originalJson(body);
        };

        next();
    };
}
