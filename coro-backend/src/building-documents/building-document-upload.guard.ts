import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { BuildingDocumentsService } from './building-documents.service';
import { KnowledgeActor } from '../knowledge/knowledge.types';

@Injectable()
export class BuildingDocumentUploadGuard implements CanActivate {
  constructor(private readonly service: BuildingDocumentsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const buildingId = request.params?.buildingId;
    const actor: KnowledgeActor = request.clientUser
      ? {
          type: 'CLIENT_USER',
          id: request.clientUser.sub,
          organizationId: request.clientUser.organizationId,
          role: request.clientUser.role,
          buildingIds: [],
        }
      : {
          type: 'INTERNAL_USER',
          id: request.user.userId,
          organizationId: request.user.organizationId,
          role: request.user.role,
        };
    const access = await this.service.access(actor, buildingId);
    if (!access.canUpload) throw new ForbiddenException('Dépôt non autorisé');
    request.buildingDocumentActor = actor;
    return true;
  }
}
