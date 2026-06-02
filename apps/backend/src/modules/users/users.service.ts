import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { UpsertTelegramUserDto } from './dto/upsert-telegram-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async upsertTelegramUser(dto: UpsertTelegramUserDto) {
    return this.prisma.user.upsert({
      where: { telegramId: BigInt(dto.telegramId) },
      update: {
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        telegramLanguageCode: dto.languageCode,
        lastSeenAt: new Date(),
      },
      create: {
        telegramId: BigInt(dto.telegramId),
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        telegramLanguageCode: dto.languageCode,
        lastSeenAt: new Date(),
      },
    });
  }
}
