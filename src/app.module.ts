import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { BinanceModule } from './features/binance/binance.module';
import { TelegramModule } from './features/telegram/telegram.module';
import {ScheduleModule} from "@nestjs/schedule"; // 추가!

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true, // .env 전역 사용
            envFilePath: '.env',
        }),
        AppConfigModule,
        ScheduleModule.forRoot(),
        TelegramModule,
        BinanceModule,
    ],
})
export class AppModule {}