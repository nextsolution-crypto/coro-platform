-- Disposable PostgreSQL only: recreate the exact pre-DISPLAY-04A migration head.
DROP TABLE "DisplayPdfRenderJob";
DROP TYPE "DisplayPdfRenderJobStatus";
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20261201010000_display_pdf_render_jobs';
