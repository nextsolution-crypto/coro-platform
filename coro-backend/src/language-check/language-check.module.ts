import { Module } from '@nestjs/common';
import { LanguageCheckController } from './language-check.controller';
import { LanguageCheckService } from './language-check.service';

@Module({
  controllers: [LanguageCheckController],
  providers: [LanguageCheckService],
})
export class LanguageCheckModule {}