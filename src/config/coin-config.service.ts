import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CoinConfig, AppConfig } from '../common/interfaces/coin-config.interface';

@Injectable()
export class CoinConfigService implements OnModuleInit {
  private readonly logger = new Logger(CoinConfigService.name);
  private readonly configPath = path.join(process.cwd(), 'data', 'coins.json');
  private config: AppConfig;

  // 서버가 실행될 때 loadConfig() 실행하여 초기화
  onModuleInit() {
    this.loadConfig();
  }

  // data/coins.json 읽음
  private loadConfig() {
    try {
      const data = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
      this.logger.log(`✅ 설정 로드: ${this.config.coins.length}개 코인`);
    } catch (error) {
      this.logger.error('❌ 설정 로드 실패:', error.message);
      throw error;
    }
  }

  // 거래량 또는 가격 알림이 하나라도 켜진 코인만 필터링해서 반환
  getActiveCoins(): CoinConfig[] {
    return this.config.coins.filter(
      (c) => c.volume?.isActive || c.price?.isActive,
    );
  }

  // coins.json 코인 설정 조회
  getCoin(symbol: string): CoinConfig | undefined {
    return this.config.coins.find(c => c.symbol === symbol);
  }

  // coins.json의 settings 값 반환
  getSettings() {
    return this.config.settings;
  }

  // 현재 시각이 해당 알림 타입(candle/price/volume)의 수면시간에 해당하는지 체크
  isSleepTime(type: 'candle' | 'price' | 'volume'): boolean {
    const { isActive, startHour, endHour, appliesTo } = this.config.settings.sleepTime;
    if (!isActive || !appliesTo[type]) return false;

    const hour = new Date().getHours();
    return hour >= startHour || hour < endHour;
  }
}
