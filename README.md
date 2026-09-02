# 📈 StockWatch ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**Real-time portfolio tracking platform**

This project is licensed under the [MIT License](./LICENSE) © 2025 Ashish Bamba.

---

## 📌 Overview

**StockWatch** is a full-stack platform with a heavy backend (`Node`/`Express` + `WebSockets`) and a light frontend (`HTML`/`CSS` + `JS`), layered with a data engine (`Postgres` + `Redis`).

Users can register an account (or trade as an anonymous guest session), view live simulated stock prices for `AAPL`, `GOOG`, and `MSFT`, execute trades (buy/sell), set price and percent-move alerts, track their profit/loss in real time, and see how they stack up against other traders on a live leaderboard. Every new account starts with **$10,000 in simulated cash** and a welcome gift of **10 shares of AAPL**.

**Built for speed and reliability — sub-200 ms price streaming with Redis caching and polling.**

## 🎯 Core Features

- **Accounts & guest sessions** — register with email/password (JWT-backed) or trade instantly as a guest, no sign-up required
- **Real-time price streaming** via WebSockets (sub-200 ms latency)
- **Live P/L calculations** with auto-updating portfolio values
- **Trading leaderboard** ranking every registered user by total profit, updated live over WebSockets as trades execute
- **Alert engine** supporting both fixed price thresholds and percent-move alerts, with duplicate trigger prevention
- **PostgreSQL persistence** with a structured schema for users, balances, positions, and alerts

---

## 🛠️ Tech Stack

| Layer        | Technology         |
|--------------|--------------------|
| **Backend**  | NodeJS, ExpressJS, TypeScript, WebSockets |
| **Auth**     | JWT (`jsonwebtoken`), `bcryptjs` password hashing |
| **Database** | PostgreSQL  |
| **Caching / Realtime** | Redis  |
| **Containerization** | Docker, Docker Compose |
| **Frontend** | HTML, CSS, vanilla JavaScript |
| **Deployment** | Render (Docker web service + managed Postgres + Redis, see [`render.yaml`](./render.yaml)) |

---

## 🚀 How It Works

1. On first load, the frontend either restores a saved session token or mints an anonymous guest session — both are handed $10,000 in simulated cash and a starter position of 10 AAPL shares.
2. [`src/prices/provider.ts`](./src/prices/provider.ts) continuously simulates prices for `AAPL`, `MSFT`, and `GOOG`, and [`src/prices/service.ts`](./src/prices/service.ts) writes each tick into Redis and publishes it on a Redis pub/sub channel.
3. [`src/index.ts`](./src/index.ts) subscribes to that channel and rebroadcasts every price update to connected browsers over WebSockets ([`src/ws.ts`](./src/ws.ts)), so the UI updates instantly without polling.
4. Trades ([`src/routes/positions.ts`](./src/routes/positions.ts)) execute against the latest cached Redis price, updating the trader's cash balance, average cost, and realized P/L in Postgres, and pushing a leaderboard-changed event over WebSockets.
5. The alert engine ([`src/alerts/engine.ts`](./src/alerts/engine.ts)) watches every incoming price tick against each user's armed alerts (price threshold or percent move) and fires/broadcasts a notification when one triggers.

## 🏗️ Project Structure

**App Entry**:
   - [`src/index.ts`](./src/index.ts)

**Config/Infrastructure**:
   - [`src/config.ts`](./src/config.ts)
   - [`src/env.ts`](./src/env.ts)
   - [`src/db.ts`](./src/db.ts)
   - [`src/redis.ts`](./src/redis.ts)
   - [`docker-compose.yml`](./docker-compose.yml)
   - [`Dockerfile`](./Dockerfile)
   - [`render.yaml`](./render.yaml)

**HTTP Routes**:
   - [`src/routes/symbols.ts`](./src/routes/symbols.ts)
   - [`src/routes/positions.ts`](./src/routes/positions.ts)
   - [`src/routes/alerts.ts`](./src/routes/alerts.ts)
   - [`src/routes/auth.ts`](./src/routes/auth.ts)
   - [`src/routes/account.ts`](./src/routes/account.ts)
   - [`src/routes/leaderboard.ts`](./src/routes/leaderboard.ts)

**Realtime / Market Data**
   - [`src/ws.ts`](./src/ws.ts)
   - [`src/wsHub.ts`](./src/wsHub.ts)
   - [`src/prices/provider.ts`](./src/prices/provider.ts)
   - [`src/prices/service.ts`](./src/prices/service.ts)
   - [`src/alerts/engine.ts`](./src/alerts/engine.ts)
   - [`src/market.ts`](./src/market.ts)

**Auth / Accounts / Session Model**
   - [`db/schema.sql`](./db/schema.sql)
   - [`scripts/db-init.js`](./scripts/db-init.js)
   - [`src/session.ts`](./src/session.ts)
   - [`src/account.ts`](./src/account.ts)
   - [`src/asyncHandler.ts`](./src/asyncHandler.ts)

**Frontend**
   - [`public/index.html`](./public/index.html)

---

## 📸 Screenshots / Demo

## Session Storage
<img width="495" height="288" alt="Screenshot 2026-04-07 at 11 31 16 PM" src="https://github.com/user-attachments/assets/08956104-3303-4d43-84ba-cdd92ce30b6d" />


## Price Live Stream
<img width="898" height="287" alt="Screenshot 2026-04-07 at 11 31 30 PM" src="https://github.com/user-attachments/assets/10e356bd-015c-4b45-aaa5-bac0cc912338" />

## Trade Execution
<img width="464" height="245" alt="Screenshot 2026-04-07 at 11 32 06 PM" src="https://github.com/user-attachments/assets/2d3d0fb7-59fa-4400-bca6-abf2c3464245" />

## Alerts
<img width="478" height="348" alt="Screenshot 2026-04-07 at 11 32 37 PM" src="https://github.com/user-attachments/assets/9ba0e347-d711-4787-8900-c2494afa1abc" />

## Activity Feed
<img width="487" height="439" alt="Screenshot 2026-04-07 at 11 32 50 PM" src="https://github.com/user-attachments/assets/61b9cd29-7025-4cee-9a8b-0c911c375b9f" />

> Note: watchlists have since been removed from the app in favor of accounts, a leaderboard, and richer alerts — screenshots above may not reflect the latest UI (Profile/Trade tabs, leaderboard, welcome modal).

---


## 👨‍💻 Software Engineering Design Decisions

### 1. CRUD + auth workflow (17 REST endpoints)

To make the app more flexible, I integrated a CRUD workflow with multiple REST endpoints that manage **Create, Read, Update,** and **Delete** tasks, plus a small set of auth actions.

For REST APIs, the CRUD mapping is:
   - `Create` → `POST`
   - `Read` → `GET`
   - `Update` → `PUT` / `PATCH`
   - `Delete` → `DELETE`

Here's how this corresponds in my project:

`/symbols`: 1
   -  `GET /symbols`

`/positions`: 5
   -  `GET /positions`
   -  `POST /positions`
   -  `PUT /positions/:symbol`
   -  `DELETE /positions/:symbol`
   -  `POST /positions/execute`

`/alerts`: 4
   -  `GET /alerts`
   -  `POST /alerts`
   -  `PUT /alerts/:id`
   -  `DELETE /alerts/:id`

`/auth`: 5
   -  `POST /auth/register`
   -  `POST /auth/login`
   -  `PATCH /auth/email`
   -  `PATCH /auth/password`
   -  `DELETE /auth/account`

`/account`: 1
   -  `GET /account`

`/leaderboard`: 1
   -  `GET /leaderboard`


### 2. Leveraging Redis Caching + WebSockets connection to stream live price feed

I wanted to make StockWatch simulate real-world stock trading, and I knew a big part of that would come down to making the simulated price updates instantaneous to make it feel "live". Here's the pipeline I built to address this need: 

- Computing Prices in src/prices/provider.ts:
   - It sets starting prices for each stocks, then continuously updates them with a random step.
 
   - NOTE: Prices updates are configured to occur at every 750 ms intervals.

- Fetching Prices To Redis:
   - In src/prices/service.ts, we take those computed prices and fetch them into the Redis cache. In this context, "cache" means: store the latest known price so the backend can access it quickly.
     
   - NOTE: In this project, Redis is used via the `ioredis` Node package.
     
   - NOTE: Redis is a type of NoSQL database that leverages key-value data storage with the following structure:
      - `price:<SYMBOL>`: ->  latest price value
      - `price:ts:<SYMBOL>` -> latest timestamp

   The values are instantaneously updated via caching.

- Live, automatic display on frontend interface via WebSockets:
   - WebSockets keeps one API connection open, so it can continuously update the price feed display on the interface, as opposed to having to send an HTTP request from frontend interface every time a user wants to get the latest prices.
   - The same WebSocket hub also pushes `leaderboard`-changed events whenever a registered user's trade affects the standings, so the leaderboard view stays live too.

### 3. Postgres Database

I wanted to integrate account and session-based data storage into StockWatch, so I leveraged PostgreSQL. A relational database with SQL structure makes most sense here because I need structured data linking user flows (registered accounts, cash balances, trade executions, alert engine) to a specific `session_id` — either a guest session or a `user:<id>` tied to a real account. Every time a session performs an action, a new or updated row appears in the corresponding table.

### 4. Docker Containerization

I integrated Docker to ease the burden of installing dependencies. Instead of having to separately download both Redis and PostgreSQL, `docker compose up -d` brings up the data layer quickly so everyone gets the same versions of all dependencies locally. The same [`Dockerfile`](./Dockerfile) builds the production image deployed on Render.


## 📦 Installation


1.) Clone the repository:
   ```bash
   git clone https://github.com/AshishBamba05/stockwatch.git
   cd stockwatch
   ```

2.) Install `Node` dependencies:
   ```bash
   npm install
   ```

3.) Start `Postgres` and `Redis` with `Docker`:
   ```bash
   docker compose up -d
   ```

4.) Setting up `.env`:

Create a `.env` file in the project root with:
   ```bash
   DATABASE_URL=postgres://stock:stock@localhost:5432/stocktrackr
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=<a long random string>
   PORT=3000
   ```

#### Security Note:
Do NOT commit your `.env` file. It contains sensitive credentials like your DB URI and JWT secret.

Ensure `.env` is listed in your `.gitignore`.

5.) Initialize the database schema:
   ```bash
   npm run db:init
   ```

6.) Start the development server:
   ```bash
   npm run dev
   ```

Then, open the following link:
`http://localhost:3000`
