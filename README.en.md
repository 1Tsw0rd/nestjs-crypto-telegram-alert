# NestJS Crypto Telegram Alert

[한국어](./README.md) | **English**

```text
┌──────────────────────────────────────────┐
│   NESTJS · BINANCE FUTURES · TELEGRAM     │
│         Event-Driven Alert Server         │
└──────────────────────────────────────────┘
```

A NestJS server that subscribes to real-time Binance Futures kline data over WebSocket and sends Telegram alerts when price, volume, or candle-close conditions are met.

Built around an `EventEmitter2`-based event subscription structure and a single `data/coins.json` config file that controls alert types, target coins, and suppression rules (cooldown/sleep time) — no code changes required.

> **Project goal**
>
> - Apply different duplicate-suppression strategies to data with different characteristics: price (volatile) vs. volume (cumulative)
> - Manage target coins and alert on/off through a single `coins.json`

> **Project context**
>
> - Originally built for personal use, later refined for completeness
> - Developed mainly with Claude as the AI tool — code was refined through an iterative feedback loop

---

## Screenshots

<table>
  <tr>
    <td align="center">
      <img src="docs/images/price.png" width="250" alt="Price alert example"><br>
      Price alert
    </td>
    <td align="center">
      <img src="docs/images/volume.png" width="250" alt="Volume alert example"><br>
      Volume alert
    </td>
    <td align="center">
      <img src="docs/images/candle.png" width="250" alt="Candle-close alert example"><br>
      Candle-close alert
    </td>
  </tr>
</table>

---

## Tech Stack

| Category | Technology |
| --- | --- |
| Runtime | Node.js |
| Framework | NestJS 11 (TypeScript) |
| Real-time communication | `ws` (direct connection to Binance Futures WebSocket) |
| Event handling | `@nestjs/event-emitter` |
| Scheduling | `@nestjs/schedule` (`@Cron`) |
| Notifications | `node-telegram-bot-api` |
| Number formatting | `numeral` |
| Configuration | `@nestjs/config` (`.env`) + `data/coins.json` |
| Package manager | pnpm |
| Testing | Jest |

---

## Architecture

```text
Binance Futures WebSocket
        │
        ▼
BinanceWebSocketService
        │  kline.update (EventEmitter2)
        │
        ├─────────────┬────────────────────┐
        ▼             ▼                    ▼
PriceAlertService   VolumeAlertService   CandleAlertService
        │             │                  (independent of kline.update, separate @Cron)
        └─────────────┴───────┬──────────────┘
                              ▼
                      TelegramService
```

All of the services above receive their configuration from `CoinConfigService` (`data/coins.json`).

### Alert flow

1. When kline data arrives over the Binance WebSocket, it's published as a single `kline.update` event
2. `PriceAlertService` and `VolumeAlertService` each subscribe to the same event and judge independently
3. When a condition is met, `TelegramService` sends the alert to the channel matching its type
4. `CandleAlertService` is unrelated to this event flow — it fires separately on a `@Cron` schedule at each candle-close time

---

## Directory Structure

```text
.
├── data/
│   └── coins.json                       # Per-coin alert settings + shared settings
│
├── docs/
│   ├── DEVELOPMENT.md                   # Install/run/env guide (Korean)
│   ├── DEVELOPMENT.en.md                # Install/run/env guide (English)
│   └── images/                          # Screenshots for README
│       ├── price.png
│       ├── volume.png
│       └── candle.png
│
├── src/
│   ├── main.ts                          # Server entry point
│   ├── app.module.ts                    # Root module
│   │
│   ├── common/
│   │   └── interfaces/
│   │       ├── coin-config.interface.ts # coins.json schema types
│   │       └── candle.interface.ts      # CandleType (candle alert kinds)
│   │
│   ├── config/
│   │   ├── config.module.ts             # Global CoinConfigService module
│   │   ├── coin-config.service.ts       # Loads coins.json, exposes settings
│   │   └── coin-config.service.spec.ts
│   │
│   └── features/
│       ├── binance/
│       │   ├── binance.module.ts
│       │   └── services/
│       │       ├── websocket.service.ts     # Connects to Binance kline WebSocket, emits kline.update
│       │       ├── price-alert.service.ts   # Price alerts — up/down crossing detection, cooldown
│       │       ├── price-alert.service.spec.ts
│       │       ├── volume-alert.service.ts  # Volume alerts — threshold crossing, per-candle dedup
│       │       ├── volume-alert.service.spec.ts
│       │       ├── candle-alert.service.ts  # Candle-close alerts (@Cron schedule)
│       │       └── candle-alert.service.spec.ts
│       │
│       └── telegram/
│           ├── telegram.module.ts
│           ├── services/
│           │   ├── telegram.service.ts       # Sends messages + formats text
│           │   └── telegram.service.spec.ts
│           └── interfaces/telegram-message.interface.ts
│
├── package.json
├── nest-cli.json
├── tsconfig.json
├── README.md                            # Korean (default)
└── README.en.md                         # English
```

---

## Features

- [1. Event-Driven Architecture](#1-event-driven-architecture)
- [2. Config-Driven Alert Control](#2-config-driven-alert-control)
- [3. Price vs. Volume — Different Duplicate-Suppression Strategies](#3-price-vs-volume--different-duplicate-suppression-strategies)
- [4. Multi-Channel Telegram Delivery](#4-multi-channel-telegram-delivery)

## 1. Event-Driven Architecture

- WebSocket messages are published as a single `kline.update` event via `EventEmitter2`
- `PriceAlertService` / `VolumeAlertService` each subscribe and judge independently
- Adding a new alert type only means adding a subscriber — the WebSocket/parsing code stays untouched
- `CandleAlertService` is unrelated to this flow and runs purely on `@Cron` (independent of the WebSocket connection)

## 2. Config-Driven Alert Control

A single `data/coins.json` controls alert behavior — no code changes required.

```json
{
  "coins": [
    {
      "symbol": "BTCUSDT",
      "name": "BTC",
      "volume": { "thresholds": [1000, 1500, 2000], "isActive": true },
      "price": { "thresholds": [65000, 66000, 67000], "isActive": true }
    }
  ],
  "settings": {
    "cooldownSeconds": 15,
    "klineInterval": "15m",
    "candleAlerts": {
      "5m": true, "15m": true, "30m": false,
      "1h": true, "4h": false, "1d": false, "1w": false, "1M": false
    },
    "sleepTime": {
      "isActive": true,
      "startHour": 21,
      "endHour": 6,
      "appliesTo": { "candle": true, "price": false, "volume": false }
    }
  }
}
```

**`coins[]` fields**

| Field | Description |
| --- | --- |
| `symbol` | Binance futures symbol (e.g. `BTCUSDT`) |
| `name` | Name shown in alert messages (e.g. `BTC`) |
| `volume` / `price` | Per-coin on/off for volume/price alerts + `thresholds` (list of threshold values) |

**`settings` fields**

| Field | Description |
| --- | --- |
| `cooldownSeconds` | Price alert cooldown in seconds: no further alerts are sent for this long after one fires |
| `klineInterval` | Binance candle interval to subscribe to (`1m`–`1M`, Binance kline interval) |
| `candleAlerts` | On/off per candle type for candle-close alerts |
| `sleepTime` | Whether alerts apply during the sleep window (`startHour`–`endHour`) |

## 3. Price vs. Volume — Different Duplicate-Suppression Strategies

> **What is a cooldown?** After sending an alert, suppressing follow-up alerts for the same target for a set period of time. A time-based suppression method to prevent an alert flood from a rapidly repeating event.

The two alert types differ in the nature of their data, so their duplicate-suppression designs differ too.

```text
Price                                Volume
────────────                         ──────────────
Moves up ↕ and down                  Only accumulates within a candle
Can cross the same threshold          Once it crosses a threshold, it
  back and forth repeatedly            never drops back within that
  → risk of an alert flood             candle → no re-crossing possible
        │                                       │
        ▼                                       ▼
  Time-based cooldown                  Candle + threshold-based dedup
  (suppressed for cooldownSeconds)     (tracks thresholds already sent
                                         within the same candle)
```

## 4. Multi-Channel Telegram Delivery

Each alert type can run in its own room — a volume-alert room, a price-alert room, and a candle-close room.

Create the bot via [@BotFather](https://t.me/BotFather) with `/newbot`, and set the issued token as `TELEGRAM_BIT_RECON_BOT_TOKEN`. To find a channel/group's chat ID, add the bot to the channel (or group), send it a message once, then look it up via `https://api.telegram.org/bot<TOKEN>/getUpdates`.

```env
TELEGRAM_BIT_RECON_BOT_CHAT_ID_VOLUME=...  # Telegram chat ID dedicated to volume alerts
TELEGRAM_BIT_RECON_BOT_CHAT_ID_PRICE=...   # Telegram chat ID dedicated to price alerts
TELEGRAM_BIT_RECON_BOT_CHAT_ID_CANDLE=...  # Telegram chat ID dedicated to candle-close alerts
```

---

## Getting Started

See [docs/DEVELOPMENT.en.md](./docs/DEVELOPMENT.en.md) for installation, environment variables, running, and testing.

---

## License

MIT
