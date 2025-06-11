/**
 * @file tests/api.test.js
 * @description End-to-end API tests for authentication, events, and poznan endpoints.
 */
process.env.NODE_ENV = "test";

import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import app from "../src/server.js"; // You may need to export app instance from src/server.js
import db from "../src/db.js"; // Adjust path as needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB = path.join(__dirname, "../db/test.sqlite");

// Utility to reset test DB
beforeAll(async () => {
    // Remove old test DB if exists
    if (fs.existsSync(TEST_DB)) {
        fs.unlinkSync(TEST_DB);
    }

    await db.init(TEST_DB);
});

afterAll(async () => {
    const database = db.getDb();
    database.close();
    // try { await fs.promises.unlink(TEST_DB); } catch {}
});

describe("Auth Flow", () => {
    let token;
    let userId;
    const user = {
        username: "testuser",
        email: `testuser${uuidv4()}@mail.com`,
        password: "SuperSecret123!"
    };

    test("Register new user", async () => {
        const res = await request(app).post("/v1/auth/register").send(user);
        if (res.statusCode !== 201) {
            console.error("Register new user failed:", res.body);
        }
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.username).toBe(user.username);
        userId = res.body.id;
    });

    test("Fail to register with same username/email", async () => {
        const res = await request(app).post("/v1/auth/register").send(user);
        if (res.statusCode !== 409) {
            console.error("Duplicate register failed:", res.body);
        }
        expect(res.statusCode).toBe(409);
        expect(res.body.error).toMatch(/in use/i);
    });

    test("Login with correct credentials", async () => {
        const res = await request(app).post("/v1/auth/login").send({
            usernameOrEmail: user.username,
            password: user.password
        });
        if (res.statusCode !== 200) {
            console.error("Login failed:", res.body);
        }
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("token");
        token = res.body.token;
    });

    test("Login with wrong password", async () => {
        const res = await request(app).post("/v1/auth/login").send({
            usernameOrEmail: user.username,
            password: "wrongpassword"
        });
        if (res.statusCode !== 401) {
            console.error("Login with wrong password did not fail as expected:", res.body);
        }
        expect(res.statusCode).toBe(401);
    });

    test("Get profile with token", async () => {
        const res = await request(app)
            .get("/v1/auth/me")
            .set("Authorization", `Bearer ${token}`);
        if (res.statusCode !== 200) {
            console.error("Get profile with token failed:", res.body);
        }
        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe(user.username);
    });

    test("Fail to get profile without token", async () => {
        const res = await request(app).get("/v1/auth/me");
        if (res.statusCode !== 401) {
            console.error("Unauthenticated /me did not fail as expected:", res.body);
        }
        expect(res.statusCode).toBe(401);
    });

    test("Logout works", async () => {
        const res = await request(app)
            .post("/v1/auth/logout")
            .set("Authorization", `Bearer ${token}`);
        if (res.statusCode !== 200) {
            console.error("Logout failed:", res.body);
        }
        expect(res.statusCode).toBe(200);
    });

    test("Fail to use token after logout", async () => {
        const res = await request(app)
            .get("/v1/auth/me")
            .set("Authorization", `Bearer ${token}`);
        if (res.statusCode !== 401) {
            console.error("/me after logout did not fail as expected:", res.body);
        }
        expect(res.statusCode).toBe(401);
    });
});

describe("Events", () => {
    let token;
    let eventId;
    const user = {
        username: "eventuser",
        email: `eventuser${uuidv4()}@mail.com`,
        password: "EventPassw0rd!"
    };

    beforeAll(async () => {
        // Register & login a new user for event creation
        await request(app).post("/v1/auth/register").send(user);
        const loginRes = await request(app).post("/v1/auth/login").send({
            usernameOrEmail: user.username,
            password: user.password
        });
        token = loginRes.body.token;
    });

    test("Fail to create event when unauthenticated", async () => {
        const res = await request(app).post("/v1/events").send({

            stopId: "B",
            type: "info"
        });
        if (res.statusCode !== 401) {
            console.error("Unauthenticated create event did not fail as expected:", res.body);
        }
        expect(res.statusCode).toBe(401);
    });

    test("Create event (authenticated)", async () => {
        const res = await request(app)
            .post("/v1/events")
            .set("Authorization", `Bearer ${token}`)
            .send({
                stopId: "10001",
                type: "info",
                description: "Testing event creation"
            });
        if (res.statusCode !== 201) {
            console.error("Authenticated create event failed:", res.body);
        }
        expect(res.statusCode).toBe(201);
        expect(res.body.type).toBe("info");
        eventId = res.body.id;
    });

    test("List events (public)", async () => {
        const res = await request(app).get("/v1/events");
        if (res.statusCode !== 200) {
            console.error("List events failed:", res.body);
        }
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.events)).toBe(true);
    });

    test("Get event by id (public)", async () => {
        const res = await request(app).get(`/v1/events/${eventId}`);
        if (res.statusCode !== 200) {
            console.error(`Get event by id ${eventId} failed:`, res.body);
        }
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(eventId);
    });

    test("Get event by id (not found)", async () => {
        const res = await request(app).get(`/v1/events/doesnotexist`);
        if (res.statusCode !== 404) {
            console.error("Get non-existent event did not 404 as expected:", res.body);
        }
        expect(res.statusCode).toBe(404);
    });

    test("List events by type (public)", async () => {
        const res = await request(app).get(`/v1/events?type=info`);
        if (res.statusCode !== 200) {
            console.error("List events by type failed:", res.body);
        }
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.events)).toBe(true);
    });

    test("List events by timestamp (public)", async () => {
        const now = new Date().toISOString();
        const res = await request(app).get(`/v1/events?timestamp=${encodeURIComponent(now)}`);
        if (res.statusCode !== 200) {
            console.error("List events by timestamp failed:", res.body);
        }
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.events)).toBe(true);
    });
});

describe("Event Likes/Dislikes", () => {
    let token;
    let eventId;
    const user = {
        username: "likeruser",
        email: `likeruser${uuidv4()}@mail.com`,
        password: "LikePassw0rd!"
    };

    beforeAll(async () => {
        // Register & login a new user
        await request(app).post("/v1/auth/register").send(user);
        const loginRes = await request(app).post("/v1/auth/login").send({
            usernameOrEmail: user.username,
            password: user.password
        });
        token = loginRes.body.token;

        // Create an event
        const eventRes = await request(app)
            .post("/v1/events")
            .set("Authorization", `Bearer ${token}`)
            .send({
                stopId: "20001",
                type: "info",
                description: "Event to like/dislike"
            });
        eventId = eventRes.body.id;
    });

    test("Initial event stats are zero", async () => {
        const res = await request(app).get(`/v1/events/${eventId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.likes || 0).toBe(0);
        expect(res.body.dislikes || 0).toBe(0);
    });

    test("Like an event", async () => {
        const res = await request(app)
            .post(`/v1/events/${eventId}/like`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.likes).toBe(1);
        expect(res.body.dislikes).toBe(0);
    });

    test("Like again does not increment", async () => {
        const res = await request(app)
            .post(`/v1/events/${eventId}/like`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.likes).toBe(1);
        expect(res.body.dislikes).toBe(0);
    });

    test("Dislike switches the reaction", async () => {
        const res = await request(app)
            .post(`/v1/events/${eventId}/dislike`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.likes).toBe(0);
        expect(res.body.dislikes).toBe(1);
    });

    test("Dislike again does not increment", async () => {
        const res = await request(app)
            .post(`/v1/events/${eventId}/dislike`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.likes).toBe(0);
        expect(res.body.dislikes).toBe(1);
    });

    test("Like switches back", async () => {
        const res = await request(app)
            .post(`/v1/events/${eventId}/like`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.likes).toBe(1);
        expect(res.body.dislikes).toBe(0);
    });

    test("Stats reflected in GET /events", async () => {
        const res = await request(app).get("/v1/events");
        expect(res.statusCode).toBe(200);
        const found = res.body.events.find(e => e.id === eventId);
        expect(found.likes).toBe(1);
        expect(found.dislikes).toBe(0);
    });

    test("Stats reflected in GET /events/:id", async () => {
        const res = await request(app).get(`/v1/events/${eventId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.likes).toBe(1);
        expect(res.body.dislikes).toBe(0);
    });
});

describe("Poznan API Proxy", () => {
    test("GET /v1/poznan returns mapped data", async () => {
        const res = await request(app).get("/v1/poznan");
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test("GET /v1/poznan is cached (returns same data quickly)", async () => {
        const firstRes = await request(app).get("/v1/poznan");
        const secondRes = await request(app).get("/v1/poznan");
        expect(secondRes.body.data).toEqual(firstRes.body.data);
    });
});

