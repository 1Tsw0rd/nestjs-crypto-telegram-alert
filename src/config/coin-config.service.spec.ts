import { CoinConfigService } from './coin-config.service';
import { AppConfig } from '../common/interfaces/coin-config.interface';

describe('CoinConfigService', () => {
  let service: CoinConfigService;

  const setConfig = (overrides: Partial<AppConfig['settings']> = {}) => {
    (service as any).config = {
      coins: [],
      settings: {
        cooldownSeconds: 10,
        klineInterval: '15m',
        candleAlerts: {
          '5m': true,
          '15m': true,
          '30m': true,
          '1h': true,
          '4h': true,
          '1d': true,
          '1w': true,
          '1M': true,
        },
        sleepTime: {
          isActive: true,
          startHour: 21,
          endHour: 6,
          appliesTo: { candle: true, price: false, volume: false },
        },
        ...overrides,
      },
    } as AppConfig;
  };

  const setHour = (hour: number) => {
    jest.useFakeTimers();
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    jest.setSystemTime(date);
  };

  beforeEach(() => {
    service = new CoinConfigService();
    setConfig();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sleepTime.isActive가 false면 시간과 무관하게 항상 false를 반환한다', () => {
    setConfig({
      sleepTime: {
        isActive: false,
        startHour: 21,
        endHour: 6,
        appliesTo: { candle: true, price: true, volume: true },
      },
    });
    setHour(23); // 수면시간대여도

    expect(service.isSleepTime('candle')).toBe(false);
  });

  it('appliesTo가 꺼진 타입은 수면시간이어도 false를 반환한다', () => {
    setHour(23); // 수면시간대. appliesTo: candle=true, price=false

    expect(service.isSleepTime('price')).toBe(false);
    expect(service.isSleepTime('candle')).toBe(true);
  });

  it('수면시간대(21시~06시, 자정 넘김)를 올바르게 판단한다', () => {
    setHour(23); // 밤 11시 - 수면시간
    expect(service.isSleepTime('candle')).toBe(true);

    setHour(3); // 새벽 3시 - 수면시간
    expect(service.isSleepTime('candle')).toBe(true);

    setHour(14); // 오후 2시 - 수면시간 아님
    expect(service.isSleepTime('candle')).toBe(false);
  });

  it('getCoin은 심볼로 코인 설정을 찾아 반환한다', () => {
    (service as any).config.coins = [{ symbol: 'BTCUSDT', name: 'BTC' }];

    expect(service.getCoin('BTCUSDT')?.name).toBe('BTC');
    expect(service.getCoin('ETHUSDT')).toBeUndefined();
  });

  it('getActiveCoins는 volume 또는 price가 활성화된 코인만 반환한다', () => {
    (service as any).config.coins = [
      {
        symbol: 'BTCUSDT',
        name: 'BTC',
        price: { isActive: true, thresholds: [] },
      },
      {
        symbol: 'ETHUSDT',
        name: 'ETH',
        volume: { isActive: false, thresholds: [] },
      },
      { symbol: 'XRPUSDT', name: 'XRP' },
    ];

    const active = service.getActiveCoins();

    expect(active.map((c) => c.symbol)).toEqual(['BTCUSDT']);
  });
});
