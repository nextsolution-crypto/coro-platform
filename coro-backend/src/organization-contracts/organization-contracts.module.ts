import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { OrganizationContractsController } from './organization-contracts.controller';
import { OrganizationContractChildrenController } from './organization-contract-children.controller';
import { OrganizationContractsService } from './organization-contracts.service';
@Module({
  imports: [PrismaModule, AdminAuditModule, StorageModule],
  controllers: [
    OrganizationContractsController,
    OrganizationContractChildrenController,
  ],
  providers: [OrganizationContractsService],
  exports: [OrganizationContractsService],
})
export class OrganizationContractsModule {}
