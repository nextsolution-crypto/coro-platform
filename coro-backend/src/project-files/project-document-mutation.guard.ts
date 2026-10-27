import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { projectAccessWhere } from '../auth/project-access';

@Injectable()
export class ProjectDocumentMutationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const actor = request.user;
    const projectId = request.params?.projectId;
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        isActive: true,
        status: { not: 'ARCHIVED' },
        ...projectAccessWhere(actor),
      },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return true;
  }
}
