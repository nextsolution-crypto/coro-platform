import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PopulationService } from './population.service';
import { RegisterPopulationSubscriberDto } from './dto/register-population-subscriber.dto';
import { VerifyPopulationSubscriberDto } from './dto/verify-population-subscriber.dto';
import { ResendPopulationVerificationDto } from './dto/resend-population-verification.dto';
import { UnsubscribePopulationSubscriberDto } from './dto/unsubscribe-population-subscriber.dto';
import { PopulationAccessDto } from './dto/population-access.dto';
import { UpdatePopulationPreferencesDto } from './dto/update-population-preferences.dto';

@Controller('population/public')
export class PopulationPublicController {
  constructor(
    private readonly populationService: PopulationService,
  ) {}

  @Get(':publicSlug')
  async getPublicProgram(
    @Param('publicSlug') publicSlug: string,
  ) {
    return this.populationService.getPublicProgram(publicSlug);
  }

  @Post(':publicSlug/register')
  async registerSubscriber(
    @Param('publicSlug') publicSlug: string,
    @Body() dto: RegisterPopulationSubscriberDto,
  ) {
    return this.populationService.registerSubscriber(
      publicSlug,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/resend-verification')
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 10 },
  })
  async resendVerification(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: ResendPopulationVerificationDto,
  ) {
    return this.populationService.resendVerification(
      publicSlug,
      subscriberId,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/request-access')
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 10 },
  })
  async requestSubscriberAccess(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: ResendPopulationVerificationDto,
  ) {
    return this.populationService.requestSubscriberAccess(
      publicSlug,
      subscriberId,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/verify-access')
  @Throttle({
    short: { ttl: 60000, limit: 10 },
    long: { ttl: 3600000, limit: 30 },
  })
  async verifySubscriberAccess(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: VerifyPopulationSubscriberDto,
  ) {
    return this.populationService.verifySubscriberAccess(
      publicSlug,
      subscriberId,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/profile')
  async getSubscriberProfile(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: PopulationAccessDto,
  ) {
    return this.populationService.getSubscriberProfile(
      publicSlug,
      subscriberId,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/preferences')
  async updateSubscriberPreferences(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: UpdatePopulationPreferencesDto,
  ) {
    return this.populationService.updateSubscriberPreferences(
      publicSlug,
      subscriberId,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/unsubscribe')
  async unsubscribeSubscriber(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: UnsubscribePopulationSubscriberDto,
  ) {
    return this.populationService.unsubscribeSubscriber(
      publicSlug,
      subscriberId,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/verify')
  @Throttle({
    short: { ttl: 60000, limit: 10 },
    long: { ttl: 3600000, limit: 30 },
  })
  async verifySubscriber(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: VerifyPopulationSubscriberDto,
  ) {
    return this.populationService.verifySubscriber(
      publicSlug,
      subscriberId,
      dto,
    );
  }
}
