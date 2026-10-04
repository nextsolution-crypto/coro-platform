import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PopulationService } from './population.service';
import { RegisterPopulationSubscriberDto } from './dto/register-population-subscriber.dto';
import { VerifyPopulationSubscriberDto } from './dto/verify-population-subscriber.dto';
import { ResendPopulationVerificationDto } from './dto/resend-population-verification.dto';
import { UnsubscribePopulationSubscriberDto } from './dto/unsubscribe-population-subscriber.dto';
import { PopulationAccessDto } from './dto/population-access.dto';
import { UpdatePopulationPreferencesDto } from './dto/update-population-preferences.dto';
import { ResolvePopulationLocationDto } from './dto/resolve-population-location.dto';
import { ConfirmPopulationLocationDto } from './dto/confirm-population-location.dto';
import { RequestPopulationAccessByDestinationDto } from './dto/request-population-access-by-destination.dto';
import { VerifyPopulationAccessRequestDto } from './dto/verify-population-access-request.dto';
import { SelectPopulationLocationDto } from './dto/select-population-location.dto';
import {
  InitiatePopulationEmailChangeDto,
  InitiatePopulationPhoneChangeDto,
  PopulationContactChangeActionDto,
  VerifyPopulationContactChangeDto,
} from './dto/population-contact-change.dto';
import { PopulationContactChangeService } from './population-contact-change.service';
import { PopulationContactChangeType } from '@prisma/client';

@Controller('population/public')
export class PopulationPublicController {
  constructor(
    private readonly populationService: PopulationService,
    private readonly contactChanges: PopulationContactChangeService,
  ) {}

  @Post(':publicSlug/subscribers/:subscriberId/contact/phone/initiate')
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 10 },
  })
  initiatePhoneChange(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: InitiatePopulationPhoneChangeDto,
  ) {
    return this.contactChanges.initiatePhone(publicSlug, subscriberId, {
      ...dto,
      destination: dto.phone,
    });
  }

  @Post(':publicSlug/subscribers/:subscriberId/contact/phone/verify')
  @Throttle({
    short: { ttl: 60000, limit: 10 },
    long: { ttl: 3600000, limit: 30 },
  })
  verifyPhoneChange(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: VerifyPopulationContactChangeDto,
  ) {
    return this.contactChanges.verify(
      publicSlug,
      subscriberId,
      PopulationContactChangeType.PHONE,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/contact/phone/resend')
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 10 },
  })
  resendPhoneChange(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: PopulationContactChangeActionDto,
  ) {
    return this.contactChanges.resend(
      publicSlug,
      subscriberId,
      PopulationContactChangeType.PHONE,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/contact/phone/cancel')
  cancelPhoneChange(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: PopulationContactChangeActionDto,
  ) {
    return this.contactChanges.cancel(
      publicSlug,
      subscriberId,
      PopulationContactChangeType.PHONE,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/contact/email/initiate')
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 10 },
  })
  initiateEmailChange(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: InitiatePopulationEmailChangeDto,
  ) {
    return this.contactChanges.initiateEmail(publicSlug, subscriberId, {
      ...dto,
      destination: dto.email,
    });
  }

  @Post(':publicSlug/subscribers/:subscriberId/contact/email/verify')
  @Throttle({
    short: { ttl: 60000, limit: 10 },
    long: { ttl: 3600000, limit: 30 },
  })
  verifyEmailChange(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: VerifyPopulationContactChangeDto,
  ) {
    return this.contactChanges.verify(
      publicSlug,
      subscriberId,
      PopulationContactChangeType.EMAIL,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/contact/email/resend')
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 10 },
  })
  resendEmailChange(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: PopulationContactChangeActionDto,
  ) {
    return this.contactChanges.resend(
      publicSlug,
      subscriberId,
      PopulationContactChangeType.EMAIL,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/contact/email/cancel')
  cancelEmailChange(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body() dto: PopulationContactChangeActionDto,
  ) {
    return this.contactChanges.cancel(
      publicSlug,
      subscriberId,
      PopulationContactChangeType.EMAIL,
      dto,
    );
  }

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

  @Post(':publicSlug/access/request')
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    long: { ttl: 3600000, limit: 10 },
  })
  async requestSubscriberAccessByDestination(
    @Param('publicSlug') publicSlug: string,
    @Body(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })) dto: RequestPopulationAccessByDestinationDto,
  ) {
    return this.populationService.requestSubscriberAccessByDestination(
      publicSlug,
      dto,
    );
  }

  @Post(':publicSlug/access/verify')
  @Throttle({
    short: { ttl: 60000, limit: 10 },
    long: { ttl: 3600000, limit: 30 },
  })
  async verifySubscriberAccessRequest(
    @Param('publicSlug') publicSlug: string,
    @Body(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })) dto: VerifyPopulationAccessRequestDto,
  ) {
    return this.populationService.verifySubscriberAccessRequest(
      publicSlug,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/location/resolve')
  @Throttle({
    short: { ttl: 60000, limit: 5 },
    long: { ttl: 3600000, limit: 20 },
  })
  async resolveSubscriberLocation(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    dto: ResolvePopulationLocationDto,
  ) {
    return this.populationService.resolveSubscriberLocation(
      publicSlug,
      subscriberId,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/location/select')
  @Throttle({
    short: { ttl: 60000, limit: 5 },
    long: { ttl: 3600000, limit: 20 },
  })
  async selectSubscriberLocation(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    dto: SelectPopulationLocationDto,
  ) {
    return this.populationService.selectSubscriberLocation(
      publicSlug,
      subscriberId,
      dto,
    );
  }

  @Post(':publicSlug/subscribers/:subscriberId/location/confirm')
  @Throttle({
    short: { ttl: 60000, limit: 10 },
    long: { ttl: 3600000, limit: 30 },
  })
  async confirmSubscriberLocation(
    @Param('publicSlug') publicSlug: string,
    @Param('subscriberId') subscriberId: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    dto: ConfirmPopulationLocationDto,
  ) {
    return this.populationService.confirmSubscriberLocation(
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
