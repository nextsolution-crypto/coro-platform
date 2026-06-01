import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module4Service } from './module4.service';

@Controller('procedures/library')
@UseGuards(AuthGuard('jwt'))
export class LibraryController {

  constructor(private readonly module4Service: Module4Service) {}

  @Get()
  async getLibrary() {
    return this.module4Service.getLibrary();
  }
}