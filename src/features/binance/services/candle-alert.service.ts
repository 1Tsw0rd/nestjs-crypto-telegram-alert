import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CoinConfigService } from '../../../config/coin-config.service';
import { TelegramService } from '../../telegram/services/telegram.service';
import { CandleType } from '../../../common/interfaces/candle.interface';

@Injectable()
export class CandleAlertService {
  private readonly logger = new Logger(CandleAlertService.name);

  constructor(
    private coinConfigService: CoinConfigService,
    private telegramService: TelegramService,
  ) {}

  /**
   * 봉 갱신 알림 공통 처리
   * - candleAlerts 플래그 꺼져있으면 스킵
   * - 수면시간이면 조용히 스킵 (로그 없음)
   */
  private handleCandleAlert(type: CandleType, emoji: string, label: string) {
    if (!this.coinConfigService.getSettings().candleAlerts[type]) return;
    if (this.coinConfigService.isSleepTime('candle')) return;

    this.logger.log(`${emoji} ${label} 갱신!`);
    this.telegramService.sendCandleAlert(type);
  }

  /**
   * 5분봉 갱신 (00, 05, 10, ... 55분)
   */
  @Cron('*/5 * * * *', {
    name: '5m-candle',
    timeZone: 'Asia/Seoul',
  })
  handle5MinuteCandle() {
    this.handleCandleAlert('5m', '⏱️', '5분봉');
  }

  /**
   * 15분봉 갱신 (00, 15, 30, 45분)
   */
  @Cron('0,15,30,45 * * * *', {
    name: '15m-candle',
    timeZone: 'Asia/Seoul',
  })
  handle15MinuteCandle() {
    this.handleCandleAlert('15m', '⏰', '15분봉');
  }

  /**
   * 30분봉 갱신 (00, 30분)
   */
  @Cron('0,30 * * * *', {
    name: '30m-candle',
    timeZone: 'Asia/Seoul',
  })
  handle30MinuteCandle() {
    this.handleCandleAlert('30m', '🕧', '30분봉');
  }

  /**
   * 1시간봉 갱신 (매시간 00분)
   */
  @Cron('0 * * * *', {
    name: '1h-candle',
    timeZone: 'Asia/Seoul',
  })
  handle1HourCandle() {
    this.handleCandleAlert('1h', '🕐', '1시간봉');
  }

  /**
   * 4시간봉 갱신 (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
   */
  @Cron('0 0,4,8,12,16,20 * * *', {
    name: '4h-candle',
    timeZone: 'Asia/Seoul',
  })
  handle4HourCandle() {
    this.handleCandleAlert('4h', '🕓', '4시간봉');
  }

  /**
   * 일봉 갱신 (매일 00:00)
   */
  @Cron('0 0 * * *', {
    name: 'daily-candle',
    timeZone: 'Asia/Seoul',
  })
  handleDailyCandle() {
    this.handleCandleAlert('1d', '📈', '일봉');
  }

  /**
   * 주봉 갱신 (매주 월요일 00:00)
   */
  @Cron('0 0 * * 1', {
    name: 'weekly-candle',
    timeZone: 'Asia/Seoul',
  })
  handleWeeklyCandle() {
    this.handleCandleAlert('1w', '📊', '주봉');
  }

  /**
   * 달봉 갱신 (매월 1일 00:00)
   */
  @Cron('0 0 1 * *', {
    name: 'monthly-candle',
    timeZone: 'Asia/Seoul',
  })
  handleMonthlyCandle() {
    this.handleCandleAlert('1M', '📅', '달봉');
  }

  /**
   * 테스트용
   */
  // @Cron('* * * * * *', {
  //   name: 'test-candle',
  //   timeZone: 'Asia/Seoul',
  // })
  // handleTestCandle() {
  //   this.logger.log('🧪 테스트 알림');
  //   this.telegramService.sendCandleAlert('1M'); // 여기 바꾸면서 사용
  // }
}
