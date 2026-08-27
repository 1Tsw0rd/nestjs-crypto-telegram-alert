import { Module, Global } from '@nestjs/common';
import { CoinConfigService } from './coin-config.service';

@Global()
@Module({
  providers: [CoinConfigService],
  exports: [CoinConfigService],
})
export class ConfigModule {}
