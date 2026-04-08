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

---

## 📸 Screenshots / Demo

---

## 📦 Installation


1. Clone the repository:
   ```bash
   git clone https://github.com/AshishBamba05/stocktrackr.git
   cd stocktrackr
   ```

2.) Install Node dependencies
   ```bash
   npm install
   ```

3.) Start Postgres and Redis with Docker
   ```bash
   docker compose up -d
   ```
