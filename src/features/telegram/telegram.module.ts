import { Module, Global } from '@nestjs/common';
import { TelegramService } from './services/telegram.service';

@Global() // 전역 모듈로 설정
@Module({
    providers: [TelegramService],
    exports: [TelegramService],
})
export class TelegramModule {}