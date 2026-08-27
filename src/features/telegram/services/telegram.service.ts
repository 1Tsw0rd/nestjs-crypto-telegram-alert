import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
import {
  VolumeAlertMessage,
  PriceAlertMessage,
} from '../interfaces/telegram-message.interface';
import type { CandleType } from '../../../common/interfaces/candle.interface';
import numeral from 'numeral';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;
  private channelIds: {
    volume?: string; // 거래량 알림 채널
    price?: string; // 가격 알림 채널
    candle?: string; // 봉 갱신 알림 채널
  } = {};

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const token = this.configService.get<string>(
      'TELEGRAM_BIT_RECON_BOT_TOKEN',
    )!; // !는 Non-null assertion operator(null 또는 undefied가 아님을 선언)

    if (!token) {
      this.logger.error('❌ 텔레그램 토큰 없음 (.env 확인)');
      return;
    }

    // 채널 ID 로드
    this.channelIds.volume = this.configService.get<string>(
      'TELEGRAM_BIT_RECON_BOT_CHAT_ID_VOLUME',
    );
    this.channelIds.price = this.configService.get<string>(
      'TELEGRAM_BIT_RECON_BOT_CHAT_ID_PRICE',
    );
    this.channelIds.candle = this.configService.get<string>(
      'TELEGRAM_BIT_RECON_BOT_CHAT_ID_CANDLE',
    );

    // 봇 초기화
    this.bot = new TelegramBot(token, {
      polling: false,
      request: {
        agentOptions: {
          keepAlive: true,
          family: 4,
        }
      } as any
    });

    this.logger.log('✅ 텔레그램 봇 초기화 완료');
    this.logger.log(`📢 거래량 채널: ${this.channelIds.volume || '미설정'}`);
    this.logger.log(`📢 가격 채널: ${this.channelIds.price || '미설정'}`);
    this.logger.log(`📢 봉 갱신 채널: ${this.channelIds.candle || '미설정'}`);
  }

  /**
   * 거래량 알림 발송
   * 설정한 거래량 이상 돌파하면 알림
   */
  async sendVolumeAlert(message: VolumeAlertMessage): Promise<void> {
    if (!this.channelIds.volume) {
      this.logger.warn('⚠️  거래량 채널 ID 없음');
      return;
    }

    try {
      const text = this.formatVolumeMessage(message);
      await this.bot.sendMessage(this.channelIds.volume, text, {
        parse_mode: 'HTML',
      });
      this.logger.log(`📱 거래량 알림 발송: ${message.name}`);
    } catch (error) {
      this.logger.error('텔레그램 발송 실패:', error.message);
    }
  }

  private formatVolumeMessage(msg: VolumeAlertMessage): string {
    // 봉 시작 시간 포맷 (예: 14:30)
    const startTime = msg.candleStartTime.toLocaleString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // 24시간 형식
    });

    const currentVolume = numeral(msg.currentVolume).format('0,0'); // 현재 거래량을 한국어 형식으로 변환 (예: 1,500, 2,300,000)
    const thresholdsText = msg.triggeredThresholds
      .map((t) => numeral(t).format('0,0')) // 기준치 한국어 형식은 0,0 사용, 축약형 0.0a 사용
      .join(' | ');

    return `
    🚨 <b>[ ${msg.name} ] 거래량 알림!</b>
    ━━━━━━━━━━━━━━━
    <b>📊 현재 거래량:</b> ${currentVolume}
    <b>🎯 돌파한 기준치:</b> [ ${thresholdsText} ]
    <b>⏱️ 봉 종류:</b> ${msg.interval} (${startTime} 시작)
    ━━━━━━━━━━━━━━━
      `.trim();
  }

  /**
   * 가격 알림 발송
   */
  async sendPriceAlert(message: PriceAlertMessage): Promise<void> {
    if (!this.channelIds.price) {
      this.logger.warn('⚠️  가격 채널 ID 없음');
      return;
    }

    try {
      const text = this.formatPriceMessage(message);
      await this.bot.sendMessage(this.channelIds.price, text, {
        parse_mode: 'HTML',
      });
      this.logger.log(`📱 가격 알림 발송: ${message.name}`);
    } catch (error) {
      this.logger.error('텔레그램 발송 실패:', error.message);
    }
  }

  private formatPriceMessage(msg: PriceAlertMessage): string {
    const { lastPrice, currentPrice, crossedThresholds, isUp } = msg;
    const emoji = isUp ? '🟢' : '🔴';
    const directionText = isUp ? '상향 돌파' : '하향 이탈';

    const crossedText = crossedThresholds
      .map((t) => t.toLocaleString('ko-KR'))
      .join(', ');
    const lastPriceFormatted = lastPrice.toLocaleString('ko-KR', {
      maximumFractionDigits: 4,
    });
    const currentPriceFormatted = currentPrice.toLocaleString('ko-KR', {
      maximumFractionDigits: 4,
    });

    return `
  ${emoji} <b>[ ${msg.name} ] 가격 ${directionText}!</b>
  ━━━━━━━━━━━━━━━
  <b>📉 직전가:</b> ${lastPriceFormatted} USDT
  <b>📊 현재가:</b> <b>${currentPriceFormatted} USDT</b>
  <b>🎯 돌파한 설정가:</b> [ <b>${crossedText}</b> ]
  ━━━━━━━━━━━━━━━
    `.trim();
  }

  /**
   * 봉 갱신 알림 발송
   */
  async sendCandleAlert(candleType: CandleType): Promise<void> {
    if (!this.channelIds.candle) {
      this.logger.warn('⚠️  봉 갱신 채널 ID 미설정');
      return;
    }

    try {
      const text = this.formatCandleMessage(candleType);
      await this.bot.sendMessage(this.channelIds.candle, text, {
        parse_mode: 'HTML',
      });

      const typeMap = {
        '5m': '5분봉',
        '15m': '15분봉',
        '30m': '30분봉',
        '1h': '1시간봉',
        '4h': '4시간봉',
        '1d': '일봉',
        '1w': '주봉',
        '1M': '달봉',
      };

      this.logger.log(`📢 ${typeMap[candleType]} 갱신 알림 발송`);
    } catch (error) {
      this.logger.error('봉 갱신 알림 발송 실패:', error.message);
    }
  }

  private formatCandleMessage(candleType: CandleType): string {
    const config = {
      '5m': { emoji: '⏱️', name: '5분봉' },
      '15m': { emoji: '⏰', name: '15분봉' },
      '30m': { emoji: '🕧', name: '30분봉' },
      '1h': { emoji: '🕐', name: '1시간봉' },
      '4h': { emoji: '🕓', name: '4시간봉' },
      '1d': { emoji: '📈', name: '일봉' },
      '1w': { emoji: '📊', name: '주봉' },
      '1M': { emoji: '📅', name: '달봉' },
    };

    const { emoji, name } = config[candleType];

    return `${emoji} <b>${name} 갱신</b>`;
  }

  /**
   * 테스트 메시지 발송
   */
  async sendTestMessage(
    channelType: 'volume' | 'price' | 'candle' = 'volume',
  ): Promise<void> {
    const channelId = this.channelIds[channelType];

    if (!channelId) {
      this.logger.error(`${channelType} 채널 ID 없음`);
      return;
    }

    try {
      await this.bot.sendMessage(channelId, '✅ 2. 텔레그램 봇 연결 성공!');
      this.logger.log(`📢 테스트 메시지 발송 (${channelType})`);
    } catch (error) {
      this.logger.error('테스트 메시지 발송 실패:', error.message);
    }
  }
}
