import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CoinConfigService } from '../../../config/coin-config.service';
import WebSocket from 'ws';
import { ConfigService } from '@nestjs/config/dist/config.service';

// 캔들 데이터 인터페이스
export interface KlineData {
  symbol: string;
  close: number;
  volume: number;
  candleStartTime: number;
  isClosed: boolean;
}

@Injectable()
export class BinanceWebSocketService implements OnModuleInit {
  private readonly logger = new Logger(BinanceWebSocketService.name);
  private ws: WebSocket; // 웹소켓 클라이언트 인스턴스

  constructor(
    private coinConfigService: CoinConfigService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2, // 이벤트 발행
  ) {}

  onModuleInit() { // 서버 시작 시점에 호출
    this.connectWebSocket();
  }

  private connectWebSocket() {
    const activeCoins = this.coinConfigService.getActiveCoins();

    if (activeCoins.length === 0) {
      this.logger.warn('⚠️  활성화된 코인 없음');
      return;
    }

    // 캔들 간격은 coins.json settings.klineInterval에서 읽어옴 (기본값: 15m)
    const klineInterval = this.coinConfigService.getSettings().klineInterval;
    const streams = activeCoins
      .map((c) => `${c.symbol.toLowerCase()}@kline_${klineInterval}`)
      .join('/');

    const baseUrl = this.configService.get<string>('BINANCE_WS_BASE_URL'); // wss://fstream.binance.com/market
    const wsUrl = `${baseUrl}/stream?streams=${streams}`;
    this.logger.log(`🔌 연결: ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => { // ws 라이브러리가 연결 성공하면 open 이벤트 발생
      this.logger.log(`✅ 연결 성공: ${activeCoins.length}개 코인`);
      this.logger.log(`📋 활성 코인: ${activeCoins.map((c) => c.name).join(', ')}`);

      const settings = this.coinConfigService.getSettings();
      const sleep = settings.sleepTime;
      this.logger.log(
        `😴 수면설정: ${sleep.isActive ? `${sleep.startHour}시~${sleep.endHour}시 (캔들:${sleep.appliesTo.candle} 가격:${sleep.appliesTo.price} 거래량:${sleep.appliesTo.volume})` : '비활성'}`,
      );
      this.logger.log(`⏱️ 쿨다운: ${settings.cooldownSeconds}초`);
    });

    this.ws.on('message', (data: string) => { // 바이낸스 서버로부터 메시지 도착할 때 message 콜백 실행
      this.handleMessage(data);
    });

    this.ws.on('error', (error) => { // ws error 이벤트 발생 시
      this.logger.error('❌ 에러:', error.message);
    });

    this.ws.on('close', () => { // 웹소켓 연결 끊어질 경우 close 이벤트 발생 시
      this.logger.warn('⚠️  연결 끊김, 5초 후 재연결...');
      setTimeout(() => this.connectWebSocket(), 5000);
    });
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      if (!message.data) return;

      const kline = message.data.k;

      // 캔들 데이터 정리
      const klineData: KlineData = {
        symbol: kline.s,
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
        candleStartTime: kline.t,
        isClosed: kline.x,
      };     
      /*
      15분봉 예시

      {
        "e": "kline",      // 이벤트 타입 (항상 'kline')
        "E": 1759769088424, // 이벤트 발생 시간 (ms)
        "s": "JTOUSDT",     // 심볼
        "k": {
          "t": 1759768200000, // 캔들 시작 시간 (ms)
          "T": 1759769099999, // 캔들 종료 시간 (ms)
          "s": "JTOUSDT",      // 심볼 (중복)
          "i": "15m",          // 인터벌 (15분)
          "f": 74328830,       // 첫 트레이드 ID
          "L": 74329122,       // 마지막 트레이드 ID
          "o": "1.66300000",   // 시가 (open)
          "c": "1.66900000",   // 종가 (close) - 현재 가격
          "h": "1.66900000",   // 고가 (high)
          "l": "1.66300000",   // 저가 (low)
          "v": "9203.00000000", // 해당 15분 동안의 거래량 (Base Asset 기준)
          "n": 293,            // 트레이드 수
          "x": false,          // 캔들 종료 여부 (true면 15분봉 마감 시점)
          "q": "15331.74410000", // 해당 15분 거래의 Quote 거래량 (USDT 기준)
          "V": "7067.10000000", // taker buy base asset volume
          "Q": "11776.75660000", // taker buy quote asset volume
          "B": "0"
        }
      }
      */

      // this.logger.debug(`📡 ${klineData.symbol} | close: ${klineData.close} | vol: ${klineData.volume} | closed: ${klineData.isClosed}`);

      // 이벤트 발행 (kline.update 구독하고 있는 알림 서비스들이 메시지 받음)
      this.eventEmitter.emit('kline.update', klineData);
    } catch (error) {
      this.logger.error('메시지 처리 에러:', error.message);
    }
  }
}
