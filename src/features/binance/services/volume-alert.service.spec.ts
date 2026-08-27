import { VolumeAlertService } from './volume-alert.service';
import { CoinConfigService } from '../../../config/coin-config.service';
import { TelegramService } from '../../telegram/services/telegram.service';
import type { KlineData } from './websocket.service';

describe('VolumeAlertService', () => {
  let service: VolumeAlertService;
  let coinConfigService: jest.Mocked<CoinConfigService>;
  let telegramService: jest.Mocked<TelegramService>;

  const baseCoinConfig = {
    symbol: 'BTCUSDT',
    name: 'BTC',
    volume: { isActive: true, thresholds: [1000, 2000, 3000] },
  };

  const makeKline = (overrides: Partial<KlineData> = {}): KlineData => ({
    symbol: 'BTCUSDT',
    close: 0,
    volume: 0,
    candleStartTime: 1000,
    isClosed: false,
    ...overrides,
  });

  beforeEach(() => {
    coinConfigService = {
      getCoin: jest.fn().mockReturnValue(baseCoinConfig),
      getSettings: jest.fn().mockReturnValue({ klineInterval: '15m' }),
      isSleepTime: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<CoinConfigService>;

    telegramService = {
      sendVolumeAlert: jest.fn(),
    } as unknown as jest.Mocked<TelegramService>;

    service = new VolumeAlertService(coinConfigService, telegramService);
  });

  it('isActive가 false인 코인은 무시한다', () => {
    coinConfigService.getCoin.mockReturnValue({
      ...baseCoinConfig,
      volume: { isActive: false, thresholds: [1000] },
    });

    service.handleKlineUpdate(makeKline({ volume: 5000 }));

    expect(telegramService.sendVolumeAlert).not.toHaveBeenCalled();
  });

  it('수면시간이면 알림을 보내지 않는다', () => {
    coinConfigService.isSleepTime.mockReturnValue(true);

    service.handleKlineUpdate(makeKline({ volume: 5000 }));

    expect(telegramService.sendVolumeAlert).not.toHaveBeenCalled();
  });

  it('threshold를 넘으면 넘은 threshold들만 알림에 담아 보낸다', () => {
    service.handleKlineUpdate(makeKline({ volume: 2500 })); // 1000, 2000 돌파

    expect(telegramService.sendVolumeAlert).toHaveBeenCalledTimes(1);
    expect(telegramService.sendVolumeAlert).toHaveBeenCalledWith(
      expect.objectContaining({ triggeredThresholds: [1000, 2000] }),
    );
  });

  it('같은 캔들에서 이미 보낸 threshold는 다시 보내지 않는다', () => {
    service.handleKlineUpdate(makeKline({ volume: 1500 })); // 1000 돌파
    service.handleKlineUpdate(makeKline({ volume: 1600 })); // 여전히 1000만 넘은 상태, 재돌파 아님

    expect(telegramService.sendVolumeAlert).toHaveBeenCalledTimes(1);
  });

  it('같은 캔들에서 새로운 threshold를 추가로 넘으면 그 threshold만 알림 보낸다', () => {
    service.handleKlineUpdate(makeKline({ volume: 1500 })); // 1000 돌파
    service.handleKlineUpdate(makeKline({ volume: 2500 })); // 2000 추가 돌파

    expect(telegramService.sendVolumeAlert).toHaveBeenCalledTimes(2);
    expect(telegramService.sendVolumeAlert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ triggeredThresholds: [2000] }),
    );
  });

  it('캔들이 바뀌면(candleStartTime 다름) 같은 threshold라도 다시 알림 보낸다', () => {
    service.handleKlineUpdate(makeKline({ volume: 1500, candleStartTime: 1000 }));
    service.handleKlineUpdate(makeKline({ volume: 1500, candleStartTime: 2000 }));

    expect(telegramService.sendVolumeAlert).toHaveBeenCalledTimes(2);
  });

  it('캔들 종료(isClosed) 시 dedup 캐시가 정리된다', () => {
    service.handleKlineUpdate(
      makeKline({ volume: 1500, candleStartTime: 1000, isClosed: true }),
    );
    // 캐시가 지워졌으므로 동일 candleStartTime이라도 다시 알림 감지 가능
    service.handleKlineUpdate(
      makeKline({ volume: 1500, candleStartTime: 1000, isClosed: false }),
    );

    expect(telegramService.sendVolumeAlert).toHaveBeenCalledTimes(2);
  });
});
