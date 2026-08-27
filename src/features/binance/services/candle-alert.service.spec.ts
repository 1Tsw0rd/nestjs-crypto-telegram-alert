import { CandleAlertService } from './candle-alert.service';
import { CoinConfigService } from '../../../config/coin-config.service';
import { TelegramService } from '../../telegram/services/telegram.service';

describe('CandleAlertService', () => {
  let service: CandleAlertService;
  let coinConfigService: jest.Mocked<CoinConfigService>;
  let telegramService: jest.Mocked<TelegramService>;

  const setCandleAlerts = (overrides: Record<string, boolean> = {}) => {
    coinConfigService.getSettings.mockReturnValue({
      candleAlerts: {
        '5m': true,
        '15m': true,
        '30m': true,
        '1h': true,
        '4h': true,
        '1d': true,
        '1w': true,
        '1M': true,
        ...overrides,
      },
    } as any);
  };

  beforeEach(() => {
    coinConfigService = {
      getSettings: jest.fn(),
      isSleepTime: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<CoinConfigService>;

    telegramService = {
      sendCandleAlert: jest.fn(),
    } as unknown as jest.Mocked<TelegramService>;

    setCandleAlerts();

    service = new CandleAlertService(coinConfigService, telegramService);
  });

  it('해당 캔들 타입의 candleAlerts 플래그가 꺼져있으면 알림을 보내지 않는다', () => {
    setCandleAlerts({ '1h': false });

    service.handle1HourCandle();

    expect(telegramService.sendCandleAlert).not.toHaveBeenCalled();
  });

  it('수면시간이면 알림을 보내지 않는다', () => {
    coinConfigService.isSleepTime.mockReturnValue(true);

    service.handle1HourCandle();

    expect(telegramService.sendCandleAlert).not.toHaveBeenCalled();
  });

  it('플래그가 켜져있고 수면시간이 아니면 해당 캔들 타입으로 알림을 보낸다', () => {
    service.handle15MinuteCandle();

    expect(telegramService.sendCandleAlert).toHaveBeenCalledTimes(1);
    expect(telegramService.sendCandleAlert).toHaveBeenCalledWith('15m');
  });

  it('isSleepTime을 candle 타입으로 호출한다', () => {
    service.handleDailyCandle();

    expect(coinConfigService.isSleepTime).toHaveBeenCalledWith('candle');
  });

  it('서로 다른 캔들 타입은 독립적으로 플래그를 확인한다', () => {
    setCandleAlerts({ '5m': false });

    service.handle5MinuteCandle();
    service.handle30MinuteCandle();

    expect(telegramService.sendCandleAlert).toHaveBeenCalledTimes(1);
    expect(telegramService.sendCandleAlert).toHaveBeenCalledWith('30m');
  });
});
