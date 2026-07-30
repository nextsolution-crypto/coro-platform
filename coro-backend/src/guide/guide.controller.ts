import { Controller, Post, Param, Body, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GuideService } from './guide.service';
import type { Response } from 'express';

@Controller('projects/:projectId/guide')
@UseGuards(AuthGuard('jwt'))
export class GuideController {
  constructor(private readonly service: GuideService) {}

  @Post('export')
  async exportGuide(
    @Param('projectId') projectId: string,
    @Body() dto: { language: 'fr' | 'en' },
    @Request() req: any,
    @Res() res: Response,
  ) {
    const pdf = await this.service.generateGuide(projectId, req.user.organizationId, dto.language || 'fr');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="guide-locataire-${projectId}.pdf"`,
    });
    res.send(pdf);
  }
}