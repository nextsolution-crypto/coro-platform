import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: any;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { ...data, password: hashedPassword },
    });
  }
  async updateUser(id: string, data: any) {
  const { password, ...safeData } = data;
  return this.prisma.user.update({
    where: { id },
    data: safeData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      companyName: true,
      companyLogoB64: true,
      companyLogoFullB64: true,
      companyPhone: true,
      companyEmail: true,
    },
  });
}
}