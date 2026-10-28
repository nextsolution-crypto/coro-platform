import { Module } from '@nestjs/common';
import { Module8Controller } from './module8.controller';
import { Module8Service } from './module8.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GeneratorModule } from '../generator/generator.module';

@Module({
  imports: [PrismaModule, GeneratorModule],
  controllers: [Module8Controller],
  providers: [Module8Service],
  exports: [Module8Service],
})
export class Module8Module {}
