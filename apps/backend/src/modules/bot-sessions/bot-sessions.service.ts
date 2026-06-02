import { Injectable, NotFoundException } from '@nestjs/common';
import { BotSessionMode, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BotSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreateForUser(userId: string) {
    return this.prisma.botSession.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async setMode(userId: string, mode: BotSessionMode) {
    await this.getOrCreateForUser(userId);

    return this.prisma.botSession.update({
      where: { userId },
      data: { mode },
    });
  }

  async setLastInputText(userId: string, lastInputText: string) {
    await this.getOrCreateForUser(userId);

    return this.prisma.botSession.update({
      where: { userId },
      data: { lastInputText },
    });
  }

  async setLastArtifact(userId: string, lastArtifactId: string) {
    await this.getOrCreateForUser(userId);

    return this.prisma.botSession.update({
      where: { userId },
      data: {
        lastArtifactId,
        mode: BotSessionMode.IDLE,
      },
    });
  }

  async updateMetadata(userId: string, metadata: Prisma.InputJsonValue) {
    await this.getOrCreateForUser(userId);

    return this.prisma.botSession.update({
      where: { userId },
      data: { metadata },
    });
  }

  async resetMode(userId: string) {
    await this.getOrCreateForUser(userId);

    return this.prisma.botSession.update({
      where: { userId },
      data: { mode: BotSessionMode.IDLE },
    });
  }

  async getLastArtifactId(userId: string) {
    const session = await this.prisma.botSession.findUnique({
      where: { userId },
      select: { lastArtifactId: true },
    });

    if (!session?.lastArtifactId) {
      throw new NotFoundException('Last artifact not found');
    }

    return session.lastArtifactId;
  }
}
