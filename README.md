# 📈 StockWatch ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**Real-time portfolio tracking platform**

This project is licensed under the [MIT License](./LICENSE) © 2025 Ashish Bamba.

---

## 📌 Overview

**Stocktrackr** is a full-stack platform with a heavy backend (`Node`/`Express` + `WebSockets`) and a light frontend (`HTML`/`CSS` + `JS`), layered with data engine (`Postgres` + `Redis`).

Users can view live simulated stock prices for `AAPL`, `GOOG`, and `MSFT`, execute trades (buy/sell), receive alerts if stock crosses a price threshold they set up, and view their profit/loss margins all in a stored session.

**Built for speed and reliability — sub-200 ms price streaming with Redis caching and polling.**

## 🎯 Core Features

- **Real-time price streaming** via WebSockets (sub-200 ms latency)
- **Live P/L calculations** with auto-updating portfolio values
- **Watchlists** for tracking multiple assets
- **Alert engine** for price thresholds and duplicate trigger prevention
- **PostgreSQL persistence** with structured schema for users, assets, and trades

---

## 🛠️ Tech Stack

| Layer        | Technology         |
|--------------|--------------------|
| **Backend**  | NodeJS, ExpressJS, TypeScript, WebSockets |
| **Database** | PostgreSQL  |
| **Caching / Realtime** | Redis  |
| **Containerization** | Docker, Docker Compose |
| **Frontend** | HTML, CSS, vanilla JavaScript |
| **Deployment:** | |

---

## 🚀 How It Works



## 🏗️ Project Structure

**App Entry**:
   - [`src/index.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/index.ts)

**Config/Infrastrcture**:
   - [`src/config.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/config.ts)
   - [`src/env.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/env.ts)
   - [`src/db.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/db.ts)
   - [`src/redis.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/redis.ts)
   - [`docker-compose.yml`](https://github.com/AshishBamba05/stockwatch/blob/main/docker-compose.yml)

**HTTP Routes**:
   - [`src/routes/symbols.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/routes/symbols.ts)
   - [`src/routes/watchlists.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/routes/watchlists.ts)
   - [`src/routes/positions.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/routes/positions.ts)
   - [`src/routes/alerts.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/routes/alerts.ts)

**Realtime / Market Data**
   - [`src/ws.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/ws.ts)
   - [`src/prices/provider.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/prices/provider.ts)
   - [`src/prices/service.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/prices/service.ts)
   - [`src/alerts/engine.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/alerts/engine.ts)
   - [`src/market.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/market.ts)

**Data / Session Model**
   - [`db/schema.sql`](https://github.com/AshishBamba05/stockwatch/blob/main/db/schema.sql)
   - [`scripts/db-init.js`](https://github.com/AshishBamba05/stockwatch/blob/main/scripts/db-init.js)
   - [`src/session.ts`](https://github.com/AshishBamba05/stockwatch/blob/main/src/session.ts)

---

## 📸 Screenshots / Demo

---


## 👨‍💻 Software Engineering Design Decisions



## 📦 Installation


1.) Clone the repository:
   ```bash
   git clone https://github.com/AshishBamba05/stocktrackr.git
   cd stocktrackr
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

#### Security Note:
Do NOT commit your `.env` file. It contains sensitive credentials like your DB URI.

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
`http://localhost:<PORT_NUMBER>`
