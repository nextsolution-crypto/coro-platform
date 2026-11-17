import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OperationalFollowUpStatus } from '@prisma/client';
import { AdviserActor } from '../auth/project-access';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { AcknowledgeDirectiveDto, CreateDirectiveDto, CreateFollowUpDto, DirectiveTransitionDto, FollowUpTransitionDto, OperationalListQueryDto } from './dto/operational-directives.dto';
import { OperationalDirectivesService } from './operational-directives.service';

interface AuthenticatedRequest { user: AdviserActor }
@Controller('organizations/:organizationId/operations')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class OperationalDirectivesController {
  constructor(private readonly service: OperationalDirectivesService) {}
  @Post('directives') createDirective(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Body() dto: CreateDirectiveDto, @Request() req: AuthenticatedRequest) { return this.service.createDirective(organizationId, dto, req.user); }
  @Get('directives') listDirectives(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Query() query: OperationalListQueryDto, @Request() req: AuthenticatedRequest) { return this.service.listDirectives(organizationId, query, req.user); }
  @Post('directives/:id/submit') submit(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DirectiveTransitionDto, @Request() req: AuthenticatedRequest) { return this.service.transitionDirective(organizationId, id, 'SUBMITTED', dto, req.user); }
  @Post('directives/:id/approve') approve(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DirectiveTransitionDto, @Request() req: AuthenticatedRequest) { return this.service.transitionDirective(organizationId, id, 'APPROVED', dto, req.user); }
  @Post('directives/:id/publish') publish(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DirectiveTransitionDto, @Request() req: AuthenticatedRequest) { return this.service.transitionDirective(organizationId, id, 'PUBLISHED', dto, req.user); }
  @Post('directives/:id/revoke') revoke(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DirectiveTransitionDto, @Request() req: AuthenticatedRequest) { return this.service.transitionDirective(organizationId, id, 'REVOKED', dto, req.user); }
  @Post('directives/:id/acknowledge') acknowledge(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AcknowledgeDirectiveDto, @Request() req: AuthenticatedRequest) { return this.service.acknowledge(organizationId, id, dto, req.user); }
  @Post('follow-ups') createFollowUp(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Body() dto: CreateFollowUpDto, @Request() req: AuthenticatedRequest) { return this.service.createFollowUp(organizationId, dto, req.user); }
  @Get('follow-ups') listFollowUps(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Query() query: OperationalListQueryDto, @Request() req: AuthenticatedRequest) { return this.service.listFollowUps(organizationId, query, req.user); }
  @Post('follow-ups/:id/:transition') transitionFollowUp(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('id', ParseUUIDPipe) id: string, @Param('transition') transition: string, @Body() dto: FollowUpTransitionDto, @Request() req: AuthenticatedRequest) {
    const targets: Record<string, OperationalFollowUpStatus> = { assign: 'ASSIGNED', start: 'IN_PROGRESS', complete: 'COMPLETED', verify: 'VERIFIED', close: 'CLOSED', cancel: 'CANCELLED', reopen: 'OPEN' };
    const target = targets[transition];
    if (!target) throw new BadRequestException('Transition inconnue.');
    return this.service.transitionFollowUp(organizationId, id, target, dto, req.user);
  }
}
