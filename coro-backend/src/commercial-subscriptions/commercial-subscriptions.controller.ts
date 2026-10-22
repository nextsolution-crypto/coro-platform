import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from '../auth/platform-permission.decorator';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { CreateSubscriptionDto, SubscriptionRenewDto, SubscriptionTransitionDto } from './commercial-subscriptions.dto';
import { CommercialSubscriptionsService } from './commercial-subscriptions.service';

type Req = { user: { userId: string } };

@Controller('admin/v1/organizations/:organizationId/subscriptions')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
@RequirePlatformPermission(PlatformPermission.COMMERCIAL_SUBSCRIPTION_MANAGE, 'organizationId')
export class CommercialSubscriptionsController {
  constructor(private readonly service: CommercialSubscriptionsService) {}
  @Get() list(@Param('organizationId') organizationId: string) { return this.service.list(organizationId); }
  @Get(':id') detail(@Param('organizationId') organizationId: string, @Param('id') id: string) { return this.service.detail(organizationId, id); }
  @Post() create(@Param('organizationId') organizationId: string, @Body() dto: CreateSubscriptionDto, @Request() request: Req) { return this.service.create(organizationId, dto, request.user); }
  @Post(':id/activate') activate(@Param('organizationId') o: string, @Param('id') id: string, @Body() dto: SubscriptionTransitionDto, @Request() r: Req) { return this.service.transition(o, id, 'activate', dto, r.user); }
  @Post(':id/past-due') pastDue(@Param('organizationId') o: string, @Param('id') id: string, @Body() dto: SubscriptionTransitionDto, @Request() r: Req) { return this.service.transition(o, id, 'past-due', dto, r.user); }
  @Post(':id/suspend') suspend(@Param('organizationId') o: string, @Param('id') id: string, @Body() dto: SubscriptionTransitionDto, @Request() r: Req) { return this.service.transition(o, id, 'suspend', dto, r.user); }
  @Post(':id/reactivate') reactivate(@Param('organizationId') o: string, @Param('id') id: string, @Body() dto: SubscriptionTransitionDto, @Request() r: Req) { return this.service.transition(o, id, 'reactivate', dto, r.user); }
  @Post(':id/terminate') terminate(@Param('organizationId') o: string, @Param('id') id: string, @Body() dto: SubscriptionTransitionDto, @Request() r: Req) { return this.service.transition(o, id, 'terminate', dto, r.user); }
  @Post(':id/renew') renew(@Param('organizationId') o: string, @Param('id') id: string, @Body() dto: SubscriptionRenewDto, @Request() r: Req) { return this.service.renew(o, id, dto, r.user); }
  @Get(':id/entitlement-continuity') continuity(@Param('organizationId') o: string, @Param('id') id: string) { return this.service.entitlementContinuity(o, id); }
}
