import { PriceAlertService } from './price-alert.service';
import { CoinConfigService } from '../../../config/coin-config.service';
import { TelegramService } from '../../telegram/services/telegram.service';
import type { KlineData } from './websocket.service';

describe('PriceAlertService', () => {
  let service: PriceAlertService;
  let coinConfigService: jest.Mocked<CoinConfigService>;
  let telegramService: jest.Mocked<TelegramService>;

  const baseCoinConfig = {
    symbol: 'BTCUSDT',
    name: 'BTC',
    price: { isActive: true, thresholds: [100, 200, 300] },
  };

  const makeKline = (close: number): KlineData => ({
    symbol: 'BTCUSDT',
    close,
    volume: 0,
    candleStartTime: 0,
    isClosed: false,
  });

  beforeEach(() => {
    jest.useFakeTimers();

    coinConfigService = {
      getCoin: jest.fn().mockReturnValue(baseCoinConfig),
      getSettings: jest.fn().mockReturnValue({ cooldownSeconds: 10 }),
      isSleepTime: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<CoinConfigService>;

    telegramService = {
      sendPriceAlert: jest.fn(),
    } as unknown as jest.Mocked<TelegramService>;

    service = new PriceAlertService(coinConfigService, telegramService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('isActive가 false인 코인은 무시한다', () => {
    coinConfigService.getCoin.mockReturnValue({
      ...baseCoinConfig,
      price: { isActive: false, thresholds: [100] },
    });

    service.handleKlineUpdate(makeKline(150));

    expect(telegramService.sendPriceAlert).not.toHaveBeenCalled();
  });

  it('수면시간이면 알림을 보내지 않는다', () => {
    coinConfigService.isSleepTime.mockReturnValue(true);

    service.handleKlineUpdate(makeKline(50)); // seed
    service.handleKlineUpdate(makeKline(150)); // 100 돌파하지만 수면시간

    expect(telegramService.sendPriceAlert).not.toHaveBeenCalled();
  });

  it('첫 이벤트는 lastPrice가 없어 크로스 판정 없이 저장만 한다', () => {
    service.handleKlineUpdate(makeKline(150));

    expect(telegramService.sendPriceAlert).not.toHaveBeenCalled();
  });

  it('상향 돌파 시 해당 threshold들을 감지해 알림을 보낸다', () => {
    service.handleKlineUpdate(makeKline(50)); // seed lastPrice = 50
    service.handleKlineUpdate(makeKline(250)); // 100, 200 상향 돌파

    expect(telegramService.sendPriceAlert).toHaveBeenCalledTimes(1);
    expect(telegramService.sendPriceAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        crossedThresholds: [100, 200],
        isUp: true,
      }),
    );
  });

  it('하향 이탈 시 해당 threshold들을 감지해 알림을 보낸다', () => {
    service.handleKlineUpdate(makeKline(250)); // seed
    service.handleKlineUpdate(makeKline(50)); // 200, 100 하향 이탈

    expect(telegramService.sendPriceAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        crossedThresholds: [100, 200],
        isUp: false,
      }),
    );
  });

  it('경계값(threshold와 정확히 같은 값)도 돌파로 처리한다', () => {
    service.handleKlineUpdate(makeKline(50)); // seed
    service.handleKlineUpdate(makeKline(100)); // 정확히 100

    expect(telegramService.sendPriceAlert).toHaveBeenCalledWith(
      expect.objectContaining({ crossedThresholds: [100] }),
    );
  });

  it('돌파가 없으면 알림을 보내지 않는다', () => {
    service.handleKlineUpdate(makeKline(50)); // seed
    service.handleKlineUpdate(makeKline(60)); // 여전히 100 미만

    expect(telegramService.sendPriceAlert).not.toHaveBeenCalled();
  });

  it('쿨다운 중에는 돌파가 발생해도 알림을 보내지 않는다', () => {
    service.handleKlineUpdate(makeKline(50)); // seed
    service.handleKlineUpdate(makeKline(150)); // 100 돌파 -> 알림 + 쿨다운 시작

    expect(telegramService.sendPriceAlert).toHaveBeenCalledTimes(1);

    service.handleKlineUpdate(makeKline(250)); // 200 돌파, 쿨다운 중

    expect(telegramService.sendPriceAlert).toHaveBeenCalledTimes(1);
  });

  it('쿨다운이 끝나면 다시 알림을 보낼 수 있다', () => {
    service.handleKlineUpdate(makeKline(50)); // seed
    service.handleKlineUpdate(makeKline(150)); // 100 돌파 -> 알림

    expect(telegramService.sendPriceAlert).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10_000); // cooldownSeconds(10) 경과

    service.handleKlineUpdate(makeKline(250)); // 200 돌파

    expect(telegramService.sendPriceAlert).toHaveBeenCalledTimes(2);
  });

  it('쿨다운 중 여러 번 크로스가 발생해도 lastPrice는 계속 갱신되고, 쿨다운 종료 후 실제 최신가 기준으로 새 크로스만 알린다', () => {
    coinConfigService.getCoin.mockReturnValue({
      symbol: 'BTCUSDT',
      name: 'BTC',
      price: { isActive: true, thresholds: [100, 50, 30] },
    });

    service.handleKlineUpdate(makeKline(70)); // seed
    service.handleKlineUpdate(makeKline(110)); // 100 상향 돌파 -> 알림 + 쿨다운 시작

    expect(telegramService.sendPriceAlert).toHaveBeenCalledTimes(1);

    service.handleKlineUpdate(makeKline(40)); // [100, 50] 하향 크로스, 쿨다운 중이라 무시
    service.handleKlineUpdate(makeKline(100)); // [50, 100] 상향 크로스, 쿨다운 중이라 무시
    service.handleKlineUpdate(makeKline(40)); // [100, 50] 하향 크로스, 쿨다운 중이라 무시

    expect(telegramService.sendPriceAlert).toHaveBeenCalledTimes(1); // 쿨다운 중엔 여전히 1번

    jest.advanceTimersByTime(10_000); // cooldownSeconds(10) 경과

    service.handleKlineUpdate(makeKline(20)); // 쿨다운 중 마지막으로 갱신된 lastPrice(40) 기준 30 하향 돌파

    expect(telegramService.sendPriceAlert).toHaveBeenCalledTimes(2);
    expect(telegramService.sendPriceAlert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        lastPrice: 40,
        currentPrice: 20,
        crossedThresholds: [30],
        isUp: false,
      }),
    );
  });
});
