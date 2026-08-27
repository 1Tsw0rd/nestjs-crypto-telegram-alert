/**
 * 기본 알림 메시지
 * 모든 알림 타입의 공통 필드
 */
export interface BaseAlertMessage {
    symbol: string;  // 심볼 (예: JTOUSDT)
    name: string;    // 코인명 (예: JTO)
    // time 필드 없음: 텔레그램이 메시지 수신 시각을 자체적으로 표시해주므로 별도 전달 불필요
}

/**
 * 거래량 알림 메시지
 */
export interface VolumeAlertMessage extends BaseAlertMessage {
    currentVolume: number;  // 현재 거래량
    triggeredThresholds: number[]; // 기준치 거래량
    interval: string;          // 봉 종류 (예: 15m)
    candleStartTime: Date;     // 봉 시작 시간
}

/**
 * 가격 알림 메시지
 * 현재가와 직전가 사이에 설정된 알림 가격이 있는 경우 알림
 */
export interface PriceAlertMessage extends BaseAlertMessage {
    currentPrice: number;
    lastPrice: number;
    crossedThresholds: number[]; // 이미 계산된 결과만 받음 (계산은 price-alert.service에서)
    isUp: boolean;
}