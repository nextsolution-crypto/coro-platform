import { Controller, Post, Body } from '@nestjs/common';
import { LanguageCheckService } from './language-check.service';

@Controller('language-check')
export class LanguageCheckController {
  constructor(private readonly service: LanguageCheckService) {}

  @Post()
  async check(@Body() dto: { text: string; language: 'fr' | 'en' }) {
    return this.service.checkText(dto.text, dto.language);
  }
}