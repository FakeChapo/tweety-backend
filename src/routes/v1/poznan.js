/**
 * @file routes/v1/poznan.js
 * @description Proxy endpoint for poznan API with 5 minute caching and response mapping.
 */

import express from "express";
import axios from "axios";
import { createCache } from "../../middleware/cache.js";
import config from "../../config.js";

const router = express.Router();

const POZNAN_API_URL = config.POZNAN_API_URL;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

if (!POZNAN_API_URL) {
    console.warn("POZNAN_API_URL is not set. Poznan API endpoint will not function correctly.");
}

// Attach GET cache middleware
router.use("/", createCache(CACHE_TTL_MS));

/**
 * GET /v1/poznan
 * Fetches data from the poznan API, maps fields, and returns them.
 */
router.get("/", async (req, res, next) => {
    try {
        const response = await axios.get(POZNAN_API_URL);
        const data = response.data?.features || [];

        // Map incoming fields to flattened structure
        const mapped = data.map(item => ({
            id: item.id,
            type: item.type,
            longitude: item.geometry?.coordinates?.[0] ?? null,
            latitude: item.geometry?.coordinates?.[1] ?? null,
            // properties: item.properties || {},
            zone: item.properties.zone,
            route_type: item.properties.route_type,
            headsigns: item.properties.headsigns,
            stop_name: item.properties.stop_name,
        }));

        res.json(mapped);
    } catch (err) {
        next(err);
    }
});

export default router;
