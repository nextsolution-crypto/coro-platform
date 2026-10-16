import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformPermission, PlatformPermissionScope } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { PlatformAuthorityService } from './platform-authority.service';

type AuthenticatedRequest = { user: { userId: string } };

class DraftAuthorityDto {
  @IsUUID() operatorOrganizationId!: string;
  @IsUUID() founderUserId!: string;
  @IsString() @MinLength(10) reason!: string;
}

class ActivateAuthorityDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @MinLength(10) reason!: string;
}

class CreateGrantDto {
  @IsUUID() userId!: string;
  @IsEnum(PlatformPermission) permission!: PlatformPermission;
  @IsEnum(PlatformPermissionScope) scope!: PlatformPermissionScope;
  @IsOptional() @IsUUID() targetOrganizationId?: string;
  @IsOptional() @IsDateString() effectiveFrom?: string;
  @IsString() @MinLength(10) reason!: string;
}

class RevokeGrantDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @MinLength(10) reason!: string;
}

@Controller('admin/v1/platform-authority')
@UseGuards(AuthGuard('jwt'))
export class PlatformAuthorityController {
  constructor(private readonly authority: PlatformAuthorityService) {}

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.authority.effectivePermissions(request.user);
  }

  @Post('draft')
  createDraft(
    @Req() request: AuthenticatedRequest,
    @Body() input: DraftAuthorityDto,
  ) {
    return this.authority.createDraft(request.user, input);
  }

  @Post('activate')
  activate(
    @Req() request: AuthenticatedRequest,
    @Body() input: ActivateAuthorityDto,
  ) {
    return this.authority.activate(
      request.user,
      input.lockVersion,
      input.reason,
    );
  }

  @Get('grants')
  listGrants(@Req() request: AuthenticatedRequest) {
    return this.authority.listGrants(request.user);
  }

  @Post('grants')
  createGrant(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateGrantDto,
  ) {
    return this.authority.createGrant(request.user, input);
  }

  @Post('grants/:id/revoke')
  revokeGrant(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: RevokeGrantDto,
  ) {
    return this.authority.revokeGrant(
      request.user,
      id,
      input.lockVersion,
      input.reason,
    );
  }
}
