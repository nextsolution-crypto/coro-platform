import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientJwtGuard } from './client-jwt.guard';
import {
  ClientDisplayService,
  type ClientDisplayActor,
} from './client-display.service';
import {
  ClientDisplayListQueryDto,
  ClientDisplayObservationListQueryDto,
  SubmitDisplayCorrectionDto,
} from './dto/client-display.dto';

@Controller('client-portal/display')
@UseGuards(ClientJwtGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ClientDisplayController {
  constructor(private readonly display: ClientDisplayService) {}

  @Get() workspace(
    @Request() req: { clientUser: ClientDisplayActor },
    @Query() query: ClientDisplayListQueryDto,
  ) {
    return this.display.workspace(req.clientUser, query);
  }
  @Get('buildings/:buildingId/locations') locations(
    @Request() req: { clientUser: ClientDisplayActor },
    @Param('buildingId') id: string,
  ) {
    return this.display.locations(req.clientUser, id);
  }
  @Get('observations') observations(
    @Request() req: { clientUser: ClientDisplayActor },
    @Query() query: ClientDisplayObservationListQueryDto,
  ) {
    return this.display.observations(req.clientUser, query);
  }
  @Post('observations') submit(
    @Request() req: { clientUser: ClientDisplayActor },
    @Body() dto: SubmitDisplayCorrectionDto,
  ) {
    return this.display.submit(req.clientUser, dto);
  }

  @Get('plans/:publicationId/preview')
  async preview(
    @Request() req: { clientUser: ClientDisplayActor },
    @Param('publicationId') id: string,
    @Res() res: Response,
  ) {
    const file = await this.display.preview(req.clientUser, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('ETag', `"${file.sha256}"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Vary', 'Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.bytes);
  }
}
