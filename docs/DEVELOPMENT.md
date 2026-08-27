# Development Guide

로컬에서 이 프로젝트를 설치하고 실행하는 방법을 정리합니다.

---

## 1. Node.js 설치 (nvm 사용)

**nvm 설치:** https://www.nvmnode.com/ko/guide/introduction.html

**Node 설치 및 사용**

이 프로젝트는 Node.js 24.x 기준으로 개발되었습니다.

```bash
nvm install 24
nvm use 24
node -v   # v24.x.x 확인
```

---

## 2. pnpm 설치

패키지 매니저로 [pnpm](https://pnpm.io/)을 사용합니다.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

---

## 3. NestJS CLI 설치 (선택)

`nest` 명령어를 전역에서 쓰려면 설치합니다. 이미 `devDependencies`에 `@nestjs/cli`가 있어서 `pnpm run` 스크립트만 쓸 거라면 생략해도 됩니다.

```bash
pnpm add -g @nestjs/cli
```

---

## 4. 의존성 설치

```bash
pnpm install
```

---

## 5. 환경 변수 설정 (`.env`)

프로젝트 루트에 `.env` 파일을 만들고 아래 변수를 채웁니다.

```env
# 바이낸스 선물 웹소켓 베이스 URL
BINANCE_WS_BASE_URL="wss://fstream.binance.com/market"

# 텔레그램 봇 토큰 (BotFather에서 발급)
TELEGRAM_BIT_RECON_BOT_TOKEN=123456

# 알림 타입별 텔레그램 채널(채팅방) ID — 방을 분리해서 운영
TELEGRAM_BIT_RECON_BOT_CHAT_ID_VOLUME=-12345
TELEGRAM_BIT_RECON_BOT_CHAT_ID_PRICE=-23456
TELEGRAM_BIT_RECON_BOT_CHAT_ID_CANDLE=-34567
```

| 변수 | 설명 |
| --- | --- |
| `BINANCE_WS_BASE_URL` | 바이낸스 선물 웹소켓 접속 주소. `websocket.service.ts`에서 kline 스트림 구독 시 사용 |
| `TELEGRAM_BIT_RECON_BOT_TOKEN` | 알림을 보낼 텔레그램 봇의 토큰|
| `TELEGRAM_BIT_RECON_BOT_CHAT_ID_VOLUME` | 거래량 알림을 받을 채널(채팅방) ID |
| `TELEGRAM_BIT_RECON_BOT_CHAT_ID_PRICE` | 가격 알림을 받을 채널(채팅방) ID |
| `TELEGRAM_BIT_RECON_BOT_CHAT_ID_CANDLE` | 캔들 갱신 알림을 받을 채널(채팅방) ID |

---

## 6. 알림 대상 코인 설정

`data/coins.json`에서 감시할 코인, 임계값, 알림 on/off, 쿨다운/수면시간 등을 설정합니다. 자세한 필드 설명은 [README.md](../README.md)의 "설정 기반 알림 제어" 섹션을 참고하세요.

---

## 7. 서버 실행

```bash
# 개발 모드 (파일 변경 감지 자동 재시작)
pnpm run start:dev

# 일반 실행
pnpm run start

# 프로덕션 빌드 후 실행
pnpm run build
pnpm run start:prod
```

---

## 8. 테스트

```bash
# 유닛 테스트 실행
pnpm test

# watch 모드
pnpm run test:watch

# 커버리지 리포트
pnpm run test:cov
```
