import { NestFactory } from '@nestjs/core';
import { rename, readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { DisplayPdfEngineService } from '../display-plans/display-pdf-engine.service';
import { DisplayPdfRejectedError } from '../display-plans/display-pdf-engine.service';
import { DisplayPdfRasterizerModule } from './display-pdf-rasterizer.module';

const root = resolve(
  process.env.DISPLAY_PDF_SPOOL_DIR ?? '/var/lib/coro/display-pdf-spool',
);

async function processOne(engine: DisplayPdfEngineService) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/.test(entry.name)) continue;
    const directory = resolve(root, entry.name);
    if (!directory.startsWith(`${root}/`)) continue;
    try {
      await rename(
        join(directory, 'request.ready'),
        join(directory, 'request.processing'),
      );
    } catch {
      continue;
    }
    try {
      const request = JSON.parse(
        await readFile(join(directory, 'request.processing'), 'utf8'),
      ) as { requestId: string; pageNumber: number; dpi: number };
      if (request.requestId !== entry.name)
        throw new Error('Request mismatch.');
      const source = await readFile(join(directory, 'source.pdf'));
      const rendered = await engine.render(
        source,
        request.pageNumber,
        request.dpi,
      );
      const metadata = {
        width: rendered.width,
        height: rendered.height,
        pageCount: rendered.pageCount,
        engine: rendered.engine,
        engineVersion: rendered.engineVersion,
        parameters: rendered.parameters,
        outputBytes: rendered.bytes.length,
        outputSha256: DisplayPdfEngineService.sha256(rendered.bytes),
      };
      await writeFile(join(directory, 'output.tmp'), rendered.bytes, {
        flag: 'wx',
        mode: 0o600,
      });
      await rename(
        join(directory, 'output.tmp'),
        join(directory, 'output.png'),
      );
      await writeFile(join(directory, 'result.tmp'), JSON.stringify(metadata), {
        flag: 'wx',
        mode: 0o600,
      });
      await rename(
        join(directory, 'result.tmp'),
        join(directory, 'result.json'),
      );
    } catch (error) {
      const code =
        error instanceof DisplayPdfRejectedError
          ? error.code
          : 'RASTERIZER_FAILURE';
      const message =
        error instanceof Error
          ? error.message.replace(/[\r\n]+/g, ' ').slice(0, 300)
          : 'Ã‰chec du rasteriseur isolÃ©.';
      await writeFile(
        join(directory, 'failure.json'),
        JSON.stringify({ code, message }),
        { flag: 'wx', mode: 0o600 },
      ).catch(() => undefined);
    }
    return true;
  }
  return false;
}

async function main() {
  if (process.env.DISPLAY_PDF_RASTERIZER_ENABLED !== 'true')
    throw new Error('DISPLAY_PDF_RASTERIZER_ENABLED must be true.');
  const app = await NestFactory.createApplicationContext(
    DisplayPdfRasterizerModule,
    { logger: ['error', 'warn'] },
  );
  const engine = app.get(DisplayPdfEngineService);
  let stopping = false;
  const stop = () => (stopping = true);
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  while (!stopping) {
    if (await processOne(engine)) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  await app.close();
}

void main().catch(() => {
  process.exitCode = 1;
});
