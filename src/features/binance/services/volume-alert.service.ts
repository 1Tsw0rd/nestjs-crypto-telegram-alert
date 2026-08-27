import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CoinConfigService } from '../../../config/coin-config.service';
import type { KlineData } from './websocket.service';
import { TelegramService } from '../../telegram/services/telegram.service';

@Injectable()
export class VolumeAlertService {
  private readonly logger = new Logger(VolumeAlertService.name);

  // 캔들별로 이미 발송한 threshold들 추적 (멀티 threshold 지원)
  private alertedThresholds = new Map<string, Set<number>>();

  constructor(
    private coinConfigService: CoinConfigService,
    private telegramService: TelegramService,
  ) {}

  @OnEvent('kline.update')
  handleKlineUpdate(klineData: KlineData) {
    const config = this.coinConfigService.getCoin(klineData.symbol);
    if (!config?.volume?.isActive) return;
    if (this.coinConfigService.isSleepTime('volume')) return;

    const cacheKey = `${klineData.symbol}-${klineData.candleStartTime}`;
    const alerted = this.alertedThresholds.get(cacheKey) ?? new Set<number>();

    // 아직 발송 안 한 threshold 중, 현재 거래량이 넘은 것만 추출
    const newlyTriggered = config.volume.thresholds.filter(
      (t) => klineData.volume >= t && !alerted.has(t),
    );

    if (newlyTriggered.length > 0) {
      newlyTriggered.forEach((t) => alerted.add(t));
      this.alertedThresholds.set(cacheKey, alerted);
      this.sendAlert(klineData, config.name, newlyTriggered);
    }

    // 캔들 종료되면 캐시에서 제거 (메모리 관리)
    if (klineData.isClosed) {
      this.alertedThresholds.delete(cacheKey);
    }
  }

  private async sendAlert(
    klineData: KlineData,
    name: string,
    triggeredThresholds: number[],
  ) {
    this.logger.warn(
      `🚨 거래량 알림: ${name} - ${klineData.volume.toLocaleString()} >= [${triggeredThresholds.join(', ')}]`,
    );

    await this.telegramService.sendVolumeAlert({
      symbol: klineData.symbol,
      name,
      currentVolume: klineData.volume,
      triggeredThresholds,
      interval: this.coinConfigService.getSettings().klineInterval,
      candleStartTime: new Date(klineData.candleStartTime),
    });
  }
}