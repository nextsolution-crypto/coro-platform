import { Injectable } from '@nestjs/common';

@Injectable()
export class KnowledgeNormalizer {
  normalize(value: string): string {
    return value
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(/[\t ]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();
  }
}
