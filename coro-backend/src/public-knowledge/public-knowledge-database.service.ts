import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PublicKnowledgeDatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly publicKnowledgeEnabled: boolean;

  constructor() {
    const publicDatabaseUrl = process.env.PUBLIC_KNOWLEDGE_DATABASE_URL;
    const enabled = process.env.WEB_AI_PUBLIC_KNOWLEDGE_ENABLED === 'true';
    if (enabled && !publicDatabaseUrl)
      throw new Error('PUBLIC_KNOWLEDGE_DATABASE_URL_REQUIRED');
    const databaseUrl = publicDatabaseUrl ?? process.env.DATABASE_URL;
    super(
      databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
    );
    this.publicKnowledgeEnabled = enabled;
  }

  async onModuleInit() {
    if (this.publicKnowledgeEnabled) await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
