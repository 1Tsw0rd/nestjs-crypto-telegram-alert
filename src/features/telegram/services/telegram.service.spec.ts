import { TelegramService } from './telegram.service';
import type { ConfigService } from '@nestjs/config';
import type {
  VolumeAlertMessage,
  PriceAlertMessage,
} from '../interfaces/telegram-message.interface';

describe('TelegramService', () => {
  let service: TelegramService;
  let sendMessage: jest.Mock;

  const setChannels = (channelIds: {
    volume?: string;
    price?: string;
    candle?: string;
  }) => {
    (service as any).channelIds = channelIds;
  };

  beforeEach(() => {
    // onModuleInit()을 거치지 않고 내부 상태를 직접 주입 (실제 TelegramBot/ConfigService 불필요)
    service = new TelegramService({} as ConfigService);
    sendMessage = jest.fn().mockResolvedValue(undefined);
    (service as any).bot = { sendMessage };
  });

  describe('sendVolumeAlert', () => {
    const baseMessage: VolumeAlertMessage = {
      symbol: 'BTCUSDT',
      name: 'BTC',
      currentVolume: 1500,
      triggeredThresholds: [1000, 1200],
      interval: '15m',
      candleStartTime: new Date('2026-01-01T05:30:00+09:00'),
    };

    it('거래량 채널 ID가 없으면 발송하지 않는다', async () => {
      setChannels({});

      await service.sendVolumeAlert(baseMessage);

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('현재 거래량/돌파 기준치/봉 종류가 담긴 메시지를 HTML 모드로 발송한다', async () => {
      setChannels({ volume: 'chat-volume' });

      await service.sendVolumeAlert(baseMessage);

      expect(sendMessage).toHaveBeenCalledTimes(1);
      const [channelId, text, options] = sendMessage.mock.calls[0];

      expect(channelId).toBe('chat-volume');
      expect(options).toEqual({ parse_mode: 'HTML' });
      expect(text).toContain('BTC');
      expect(text).toContain('1,500');
      expect(text).toContain('1,000 | 1,200');
      expect(text).toContain('15m');
    });

    it('발송 중 에러가 나도 예외를 던지지 않는다', async () => {
      setChannels({ volume: 'chat-volume' });
      sendMessage.mockRejectedValueOnce(new Error('network error'));

      await expect(
        service.sendVolumeAlert(baseMessage),
      ).resolves.not.toThrow();
    });
  });

  describe('sendPriceAlert', () => {
    const baseMessage: PriceAlertMessage = {
      symbol: 'XRPUSDT',
      name: 'XRP',
      lastPrice: 1.4352,
      currentPrice: 1.4349,
      crossedThresholds: [1.435],
      isUp: false,
    };

    it('가격 채널 ID가 없으면 발송하지 않는다', async () => {
      setChannels({});

      await service.sendPriceAlert(baseMessage);

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('상향/하향 여부에 따라 다른 이모지·문구로 발송한다', async () => {
      setChannels({ price: 'chat-price' });

      await service.sendPriceAlert({ ...baseMessage, isUp: true });
      const [, upText] = sendMessage.mock.calls[0];
      expect(upText).toContain('🟢');
      expect(upText).toContain('상향 돌파');

      sendMessage.mockClear();

      await service.sendPriceAlert({ ...baseMessage, isUp: false });
      const [, downText] = sendMessage.mock.calls[0];
      expect(downText).toContain('🔴');
      expect(downText).toContain('하향 이탈');
    });

    it('직전가/현재가/돌파한 설정가/코인명이 메시지에 포함된다', async () => {
      setChannels({ price: 'chat-price' });

      await service.sendPriceAlert(baseMessage);

      const [, text] = sendMessage.mock.calls[0];
      expect(text).toContain('XRP');
      expect(text).toContain('1.435');
    });
  });

  describe('sendCandleAlert', () => {
    it('봉 갱신 채널 ID가 없으면 발송하지 않는다', async () => {
      setChannels({});

      await service.sendCandleAlert('1h');

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('캔들 종류에 맞는 텍스트로 HTML 모드 발송한다', async () => {
      setChannels({ candle: 'chat-candle' });

      await service.sendCandleAlert('15m');

      const [channelId, text, options] = sendMessage.mock.calls[0];
      expect(channelId).toBe('chat-candle');
      expect(options).toEqual({ parse_mode: 'HTML' });
      expect(text).toContain('15분봉');
    });
  });
});
