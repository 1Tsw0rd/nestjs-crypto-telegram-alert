# Development Guide

[한국어](./DEVELOPMENT.md) | **English**

Steps to install and run this project locally.

---

## 1. Install Node.js (via nvm)

**Install nvm:** https://www.nvmnode.com/guide/introduction.html

**Install and use Node**

This project was developed against Node.js 24.x.

```bash
nvm install 24
nvm use 24
node -v   # confirm v24.x.x
```

---

## 2. Install pnpm

Uses [pnpm](https://pnpm.io/) as the package manager.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

---

## 3. Install the NestJS CLI (optional)

Install this if you want the `nest` command available globally. `@nestjs/cli` is already a `devDependency`, so this can be skipped if you'll only use `pnpm run` scripts.

```bash
pnpm add -g @nestjs/cli
```

---

## 4. Install dependencies

```bash
pnpm install
```

---

## 5. Set environment variables (`.env`)

Create a `.env` file in the project root and fill in the following variables.

```env
# Binance Futures WebSocket base URL
BINANCE_WS_BASE_URL="wss://fstream.binance.com/market"

# Telegram bot token (issued via BotFather)
TELEGRAM_BIT_RECON_BOT_TOKEN=123456

# Telegram chat ID per alert type — run separate rooms per type
TELEGRAM_BIT_RECON_BOT_CHAT_ID_VOLUME=-12345
TELEGRAM_BIT_RECON_BOT_CHAT_ID_PRICE=-23456
TELEGRAM_BIT_RECON_BOT_CHAT_ID_CANDLE=-34567
```

| Variable | Description |
| --- | --- |
| `BINANCE_WS_BASE_URL` | Binance Futures WebSocket endpoint. Used by `websocket.service.ts` when subscribing to the kline stream |
| `TELEGRAM_BIT_RECON_BOT_TOKEN` | Token for the Telegram bot that sends alerts |
| `TELEGRAM_BIT_RECON_BOT_CHAT_ID_VOLUME` | Chat ID that receives volume alerts |
| `TELEGRAM_BIT_RECON_BOT_CHAT_ID_PRICE` | Chat ID that receives price alerts |
| `TELEGRAM_BIT_RECON_BOT_CHAT_ID_CANDLE` | Chat ID that receives candle-close alerts |

---

## 6. Configure alert target coins

Configure which coins to watch, thresholds, alert on/off, cooldown/sleep time, etc. in `data/coins.json`. See the "Config-Driven Alert Control" section of [README.en.md](../README.en.md) for the field reference.

---

## 7. Run the server

```bash
# Dev mode (auto-restart on file changes)
pnpm run start:dev

# Normal run
pnpm run start

# Production build then run
pnpm run build
pnpm run start:prod
```

---

## 8. Tests

```bash
# Run unit tests
pnpm test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:cov
```
