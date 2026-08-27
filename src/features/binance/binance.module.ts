import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BinanceWebSocketService } from './services/websocket.service';
import { VolumeAlertService } from './services/volume-alert.service';
import { PriceAlertService } from './services/price-alert.service';
import { CandleAlertService } from './services/candle-alert.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    BinanceWebSocketService,
    VolumeAlertService,
    PriceAlertService,
    CandleAlertService,
  ],
  exports: [BinanceWebSocketService],
})
export class BinanceModule {}
