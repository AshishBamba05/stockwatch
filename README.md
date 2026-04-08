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

## Session Storage
<img width="495" height="288" alt="Screenshot 2026-04-07 at 11 31 16 PM" src="https://github.com/user-attachments/assets/08956104-3303-4d43-84ba-cdd92ce30b6d" />


## Price Live Stream
)<img width="898" height="287" alt="Screenshot 2026-04-07 at 11 31 30 PM" src="https://github.com/user-attachments/assets/10e356bd-015c-4b45-aaa5-bac0cc912338" />

## Trade Execution
<img width="464" height="245" alt="Screenshot 2026-04-07 at 11 32 06 PM" src="https://github.com/user-attachments/assets/2d3d0fb7-59fa-4400-bca6-abf2c3464245" />

## Watchlist
<img width="484" height="235" alt="Screenshot 2026-04-07 at 11 32 21 PM" src="https://github.com/user-attachments/assets/bab9793b-4eaf-4bc3-a067-f39a6bc59437" />

## Alerts
<img width="478" height="348" alt="Screenshot 2026-04-07 at 11 32 37 PM" src="https://github.com/user-attachments/assets/9ba0e347-d711-4787-8900-c2494afa1abc" />

## Activity Feed
<img width="487" height="439" alt="Screenshot 2026-04-07 at 11 32 50 PM" src="https://github.com/user-attachments/assets/61b9cd29-7025-4cee-9a8b-0c911c375b9f" />


---


## 👨‍💻 Software Engineering Design Decisions

### 1. Building 16 REST endpoints

### 2. Leveraging Redis Caching + WebSockets connection to stream live price feed

I wanted to make StockWatch simulate real-world stock trading, and I knew a big part of that would come down to making the simulated price updates instantaneous to make it feel "live". Here's the pipeline I built to address this need: 

- Computing Prices in src/prices/provider.ts:
   - It sets starting prices for each stocks, then continuously updates them with a random step.

- Fetching Prices To Redis:
   - In src/prices/service.ts, we take those computed prices and fetch them into the Redis cache. In this context, "cache" means: store the latest known price so the backend can access it quickly.
     
   - NOTE: In this project, Redis is used via the iosredis Node package.

- Live, automatic display on frontend interface via WebSockets:
   - WebSockets keeps one API connection open, so it can continuously update the price feed display on the interface, as opposed to having to send an HTTP request from frontend interface every time a user wants to get the latest prices.

### 3. Postgres Database

### 4. Docker Containerization

I integrated Docker to ease the burden of installing dependencies. Instead of having to seperate download both Redis and PsotgreSQL, `docker compose up -d` brings up the data layer quickly so everyone gets the same layers and version setup of all dependencies.


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
