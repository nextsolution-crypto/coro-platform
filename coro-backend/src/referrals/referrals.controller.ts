import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
@UseGuards(AuthGuard('jwt'))
export class ReferralsController {
  constructor(
    private readonly referralsService: ReferralsService,
  ) {}

  private assertSuperAdmin(req: any) {
    if (req.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Accès réservé aux super administrateurs.',
      );
    }
  }

  /**
   * Liste complète des recommandations.
   * SUPER_ADMIN seulement.
   */
    @Get('me')
  findMyReferralProgram(@Request() req: any) {
    if (!req.user?.organizationId) {
      throw new ForbiddenException(
        'Aucune organisation associée à cet utilisateur.',
      );
    }

    return this.referralsService.findMyReferralProgram(
      req.user.organizationId,
    );
  }

  @Get('admin')
  findAllAdmin(@Request() req: any) {
    this.assertSuperAdmin(req);
    return this.referralsService.findAllAdmin();
  }

  /**
   * Marquer une recommandation comme qualifiée.
   */
  @Patch('admin/:id/qualify')
  qualify(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    this.assertSuperAdmin(req);

    return this.referralsService.qualify(id);
  }

  /**
   * Marquer une recommandation comme convertie.
   *
   * conversionValueCents :
   * valeur du client en cents, par exemple :
   * 150000 = 1 500,00 $
   */
  @Patch('admin/:id/convert')
  convert(
    @Param('id') id: string,
    @Body()
    body: {
      conversionValueCents?: number;
    },
    @Request() req: any,
  ) {
    this.assertSuperAdmin(req);

    return this.referralsService.convert(
      id,
      body.conversionValueCents,
    );
  }

  /**
   * Approuver la récompense.
   *
   * Crée automatiquement un ReferralCredit
   * et passe la recommandation à REWARDED.
   */
  @Post('admin/:id/reward')
  reward(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    this.assertSuperAdmin(req);

    return this.referralsService.reward(id);
  }

  /**
   * Rejeter une recommandation.
   */
  @Patch('admin/:id/reject')
  reject(
    @Param('id') id: string,
    @Body()
    body: {
      reason?: string;
      adminNotes?: string;
    },
    @Request() req: any,
  ) {
    this.assertSuperAdmin(req);

    return this.referralsService.reject(
      id,
      body.reason,
      body.adminNotes,
    );
  }

  /**
   * Annuler une recommandation.
   */
  @Patch('admin/:id/cancel')
  cancel(
    @Param('id') id: string,
    @Body()
    body: {
      adminNotes?: string;
    },
    @Request() req: any,
  ) {
    this.assertSuperAdmin(req);

    return this.referralsService.cancel(
      id,
      body.adminNotes,
    );
  }
}