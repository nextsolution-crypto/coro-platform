import { Body, Controller, ForbiddenException, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OperationalReviewReportService } from './operational-review-report.service';
import { SupersedeReportDto } from './dto/supersede-report.dto';

@Controller('admin/operational-review-reports')
@UseGuards(AuthGuard('jwt'))
export class OperationalReviewReportsAdminController {
  constructor(private readonly reports: OperationalReviewReportService) {}

  private assertSuperAdmin(request: { user?: { userId?: string; role?: string } }) {
    if (request.user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Accès réservé au super-administrateur.');
    const id = request.user.userId;
    if (!id) throw new ForbiddenException('Acteur administratif introuvable.');
    return id;
  }

  @Get('by-reference/:reference')
  findByReference(@Param('reference') reference: string, @Request() request: { user?: { userId?: string; role?: string } }) {
    this.assertSuperAdmin(request);
    return this.reports.findByReference(reference);
  }

  @Post(':reportId/supersede')
  supersede(@Param('reportId') reportId: string, @Body() dto: SupersedeReportDto, @Request() request: { user?: { userId?: string; role?: string } }) {
    const adminId = this.assertSuperAdmin(request);
    return this.reports.supersede(reportId, dto.reason, dto.comment, adminId);
  }
}
