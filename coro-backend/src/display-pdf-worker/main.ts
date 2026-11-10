import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { DisplayPdfRenderJobService } from '../display-plans/display-pdf-render-job.service';
import { DisplayPdfWorkerModule } from './display-pdf-worker.module';

const logger = new Logger('DisplayPdfWorker');

async function main() {
  if (process.env.DISPLAY_PDF_WORKER_ENABLED !== 'true')
    throw new Error('DISPLAY_PDF_WORKER_ENABLED must be true.');
  const app = await NestFactory.createApplicationContext(
    DisplayPdfWorkerModule,
    { logger: ['error', 'warn', 'log'] },
  );
  const jobs = app.get(DisplayPdfRenderJobService);
  const workerId = `pdf-worker-${randomUUID()}`;
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  await jobs.recoverAbandoned();
  while (!stopping) {
    const processed = await jobs.processNext(workerId);
    if (!processed) await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  await app.close();
  logger.log('Worker stopped cleanly.');
}

void main().catch((error: unknown) => {
  logger.error(
    error instanceof Error ? error.message : 'Worker startup failed.',
  );
  process.exitCode = 1;
});
