# Event RESTful API Server

A modern Node.js (ESM) RESTful API for event management, featuring user registration & JWT authentication, public event access, and poznan API proxying with caching.

---

## Features

- **User Registration & Login**
  Secure registration and login with password hashing and JWT (multi-device support, token revocation, 7-day expiry).

- **Events**
  - Create events (authenticated users only)
  - Publicly readable: anyone can list or view all events
  - Filter events by type and/or timestamp (returns up to 3 days before timestamp)

- **Poznan API Proxy**
  - `/v1/poznan` endpoint proxies a remote API, maps fields, and caches results for 5 minutes

- **SQLite Database**
  - Self-initializing schema on first run

---

## Getting Started

### Prerequisites

- Node.js **v18+** (ESM required)
- npm

### Installation

```sh
git clone https://github.com/FakeChapo/tweety-backend.git
cd tweety-backend
npm install
```

### Configuration

1. Copy `.env.example` to `.env` and edit as needed:
    ```sh
    cp .env.example .env
    ```

2. Example `.env`:
    ```
    PORT=3000
    DB_FILE=./db/database.sqlite
    JWT_SECRET=your_super_secret_jwt_key
    POZNAN_API_URL=https://www.poznan.pl/mim/plan/map_service.html?mtype=pub_transport&co=cluster
    ```

---

## Running the Server

```sh
npm start       # for production
npm run dev     # with nodemon, for development
```

Server will auto-create the SQLite database and tables if they do not exist.

---

## API Endpoints

### Authentication

| Endpoint         | Method | Body / Query        | Description                      |
|------------------|--------|---------------------|----------------------------------|
| `/v1/auth/register` | POST   | `{ username, email, password }` | Register a new user              |
| `/v1/auth/login`    | POST   | `{ usernameOrEmail, password }` | Login, returns JWT token         |
| `/v1/auth/logout`   | POST   | (JWT in header)                 | Log out current session          |
| `/v1/auth/me`       | GET    | (JWT in header)                 | Get current user profile         |

### Events

| Endpoint               | Method | Auth        | Query / Body                       | Description                          |
|------------------------|--------|-------------|-------------------------------------|--------------------------------------|
| `/v1/events`           | GET    | Public      | `?type=TYPE&timestamp=ISO8601`      | List events, filter by type/timestamp|
| `/v1/events`           | POST   | JWT         | `{ stopId, type, description }` | Create new event (auth required)     |
| `/v1/events/:id`       | GET    | Public      |                                     | Get event by ID                      |
| `/v1/events/:id/like`       | POST    | JWT      |                                     | Give a like to a specific event                     |
| `/v1/events/:id/dislike`       | POST    | JWT      |                                     |  Give a dislike to a specific event                     |

### Poznan API Proxy

| Endpoint        | Method | Auth   | Description                                 |
|-----------------|--------|--------|---------------------------------------------|
| `/v1/poznan`  | GET    | Public | Fetches mapped data from poznan API (cached for 5 min) |

---

## Authentication

- Use the returned JWT token as:
    ```
    Authorization: Bearer <your_token>
    ```
- Each login creates a new session token (multi-device support).
- Tokens expire after 7 days or on logout.

---
