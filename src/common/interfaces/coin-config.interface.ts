import { CandleType } from './candle.interface';

export interface AlertConfig {
  isActive: boolean; // 활성화 여부
}

export interface VolumeAlertConfig extends AlertConfig {
  thresholds: number[]; // 거래량 알림 기준치 (USDT) - 이 값 넘으면 알림
}

export interface PriceAlertConfig extends AlertConfig {
  thresholds: number[]; // 가격 알림 기준치 목록 (예: [60000, 65000, 70000])
}

/**
 * 코인 설정 인터페이스
 * data/coins.json의 각 코인 항목 타입 정의
 */
export interface CoinConfig {
  symbol: string; // 바이낸스 심볼 (예: BTCUSDT, WLDUSDT)
  name: string; // 표시 이름 (예: BTC, WLD)
  volume?: VolumeAlertConfig; // 거래량 알림 설정 (선택)
  price?: PriceAlertConfig; // 가격 알림 설정 (선택)
}

/**
 * 전체 앱 설정 인터페이스
 * data/coins.json 파일 전체 구조
 */
export interface AppConfig {
  coins: CoinConfig[];  // 모니터링할 코인 목록
  settings: {
    cooldownSeconds: number;  // 중복 알림 방지 시간(초)
    klineInterval: string;    // 캔들 간격 (바이낸스 kline interval, 예: "15m")
    candleAlerts: Record<CandleType, boolean>; // 봉 종류별 갱신 알림 on/off
    sleepTime: {
      isActive: boolean;  // 수면시간 알림 억제 활성화 여부
      startHour: number;  // 수면시간 시작 시(24시간제)
      endHour: number;    // 수면시간 종료 시(24시간제)
      appliesTo: {
        candle: boolean;  // 캔들 갱신 알림에 수면시간 적용 여부
        price: boolean;   // 가격 알림에 수면시간 적용 여부
        volume: boolean;  // 거래량 알림에 수면시간 적용 여부
      };
    };
  };
}
