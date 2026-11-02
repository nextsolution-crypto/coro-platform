import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { CreateQrCodeDto, UpdateQrCodeDto } from './qr-codes.dto';
import { QrCodesService } from './qr-codes.service';

type AdminRequest = { user: { userId: string } };

@Controller('qr')
export class QrCodesController {
  constructor(private readonly service: QrCodesService) {}

  @Get('public/:slug')
  resolve(
    @Param('slug') slug: string,
    @Headers('user-agent') userAgent = '',
    @Headers('x-coro-original-method') method = 'GET',
  ) {
    return this.service.resolve(slug, userAgent, method);
  }

  @Get('admin/codes')
  @UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
  @SuperAdminOnly()
  list() {
    return this.service.list();
  }

  @Post('admin/codes')
  @UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
  @SuperAdminOnly()
  create(@Body() dto: CreateQrCodeDto, @Request() req: AdminRequest) {
    return this.service.create(dto, req.user.userId);
  }

  @Patch('admin/codes/:slug')
  @UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
  @SuperAdminOnly()
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdateQrCodeDto,
    @Request() req: AdminRequest,
  ) {
    return this.service.update(slug, dto, req.user.userId);
  }
}
