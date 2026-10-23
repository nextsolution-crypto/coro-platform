import { BadRequestException, Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { KnowledgeConfig } from './knowledge.config';
import { ExtractedPage } from './knowledge.types';

@Injectable()
export class KnowledgeExtractorService {
  constructor(private readonly config: KnowledgeConfig) {}

  async extract(bytes: Buffer, mimeType: string): Promise<ExtractedPage[]> {
    if (mimeType === 'text/plain' || mimeType === 'text/markdown')
      return [{ pageNumber: 1, text: bytes.toString('utf8') }];
    if (mimeType !== 'application/pdf')
      throw new BadRequestException('Format non indexable sans adaptateur local.');
    return this.extractPdf(bytes);
  }

  private async extractPdf(bytes: Buffer): Promise<ExtractedPage[]> {
    const directory = await mkdtemp(join(tmpdir(), 'coro-knowledge-'));
    const input = join(directory, 'input.pdf');
    await writeFile(input, bytes, { flag: 'wx' });
    try {
      return await new Promise((resolve, reject) => {
        const runner = join(__dirname, 'pdfjs-extractor-runner.mjs');
        const child = spawn(
          process.execPath,
          [runner, input, String(this.config.maxPages)],
          { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
        );
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        let settled = false;
        const finish = (error?: Error, pages?: ExtractedPage[]) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          error ? reject(error) : resolve(pages ?? []);
        };
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          finish(new Error('EXTRACTION_TIMEOUT'));
        }, this.config.extractionTimeoutMs);
        child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
        child.stderr.on('data', (chunk: Buffer) => {
          if (Buffer.concat(stderr).length < 4096) stderr.push(chunk);
        });
        child.once('error', () => finish(new Error('EXTRACTOR_CRASHED')));
        child.once('exit', (code) => {
          if (settled) return;
          if (code !== 0)
            return finish(
              new Error(Buffer.concat(stderr).toString('utf8') || 'PDF_INVALID'),
            );
          try {
            const result = JSON.parse(Buffer.concat(stdout).toString('utf8')) as {
              pages: ExtractedPage[];
            };
            finish(undefined, result.pages);
          } catch {
            finish(new Error('MALFORMED_EXTRACTION'));
          }
        });
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
