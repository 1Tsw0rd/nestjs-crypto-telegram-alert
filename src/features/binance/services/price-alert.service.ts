import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CoinConfigService } from '../../../config/coin-config.service';
import type { KlineData } from './websocket.service';
import { TelegramService } from '../../telegram/services/telegram.service';

@Injectable()
export class PriceAlertService {
  private readonly logger = new Logger(PriceAlertService.name);

  private lastPriceMap = new Map<string, number>(); // 코인별 직전가 상태 저장소
  private cooldownSymbols = new Set<string>(); // 쿨다운 중인 심볼(일정 시간만큼 알림 발송 방지)

  constructor(
    private coinConfigService: CoinConfigService,
    private telegramService: TelegramService,
  ) {}

  @OnEvent('kline.update') // 바이낸스 메시지 확인 가능한 kline.update 구독
  handleKlineUpdate(klineData: KlineData) {
    const config = this.coinConfigService.getCoin(klineData.symbol);
    if (!config?.price?.isActive) return;
    if (this.coinConfigService.isSleepTime('price')) return;

    const currentPrice = klineData.close;
    // 최초 lastPrice를 currentPrice로 초기화
    const lastPrice = this.lastPriceMap.get(klineData.symbol) ?? currentPrice;
    const isUp = currentPrice > lastPrice;
    const crossed = this.getCrossedThresholds(
      lastPrice,
      currentPrice,
      config.price.thresholds,
      isUp,
    );

    // lastPriceMap 갱신 (이후 이벤트부터는 이 값과 비교)
    this.lastPriceMap.set(klineData.symbol, currentPrice);

    if (crossed.length === 0) return; // 가격 알림 대상이 아닌 경우 알림 안 보냄

    if (this.cooldownSymbols.has(klineData.symbol)) return; // 쿨다운 중이면 알림 스킵

    this.startCooldown(klineData.symbol); // 알림 보내기 전(동기적으로) 쿨다운 시작

    this.sendAlert(klineData.symbol, config.name, lastPrice, currentPrice, crossed, isUp);
  }

  // 쿨다운 시작 - cooldownSeconds 지나면 자동으로 Set에서 제거
  private startCooldown(symbol: string) {
    this.cooldownSymbols.add(symbol);
    // 설정값을 매번 읽음: 서버 재시작 없이 coins.json 리로드하는 기능이 생겨도 최신값 반영되게 하기 위함
    const cooldownMs = this.coinConfigService.getSettings().cooldownSeconds * 1000;
    setTimeout(() => this.cooldownSymbols.delete(symbol), cooldownMs);
  }

  /**
   * lastPrice와 currentPrice 사이에 낀 threshold만 추출
   */
  private getCrossedThresholds(
    lastPrice: number,
    currentPrice: number,
    thresholds: number[],
    isUp: boolean,
  ): number[] {
    return thresholds.filter((t) =>
      isUp
        ? lastPrice < t && t <= currentPrice
        : currentPrice <= t && t < lastPrice,
    );
  }

  private async sendAlert(
    symbol: string,
    name: string,
    lastPrice: number,
    currentPrice: number,
    crossed: number[],
    isUp: boolean,
  ) {
    this.logger.warn(
      `🚨 가격 알림: ${name} - ${lastPrice} → ${currentPrice} (${crossed.join(', ')})`,
    );

    await this.telegramService.sendPriceAlert({
      symbol,
      name,
      lastPrice,
      currentPrice,
      crossedThresholds: crossed,
      isUp,
    });
  }
}
