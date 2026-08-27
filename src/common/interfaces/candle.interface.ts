/**
 * 봉 갱신 알림 종류
 * candle-alert.service.ts(스케줄링), telegram.service.ts(메시지 발송) 공통으로 사용
 */
export type CandleType =
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1d'
  | '1w'
  | '1M';
