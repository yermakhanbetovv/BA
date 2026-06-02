import { Injectable } from '@nestjs/common';
import { DetailLevel, Language, Tone } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ProjectContextsService } from '../project-contexts/project-contexts.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectContextsService: ProjectContextsService,
  ) {}

  async getOrCreateForUser(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      include: { defaultProjectContext: true },
    });

    if (settings?.defaultProjectContext) {
      return settings;
    }

    const defaultProjectContext =
      await this.projectContextsService.getDefaultContext();

    if (settings) {
      return this.prisma.userSettings.update({
        where: { userId },
        data: { defaultProjectContextId: defaultProjectContext.id },
        include: { defaultProjectContext: true },
      });
    }

    return this.prisma.userSettings.create({
      data: {
        userId,
        defaultProjectContextId: defaultProjectContext.id,
      },
      include: { defaultProjectContext: true },
    });
  }

  async updateLanguage(userId: string, language: Language) {
    await this.getOrCreateForUser(userId);

    return this.prisma.userSettings.update({
      where: { userId },
      data: { language },
      include: { defaultProjectContext: true },
    });
  }

  async updateTone(userId: string, tone: Tone) {
    await this.getOrCreateForUser(userId);

    return this.prisma.userSettings.update({
      where: { userId },
      data: { tone },
      include: { defaultProjectContext: true },
    });
  }

  async updateDetailLevel(userId: string, detailLevel: DetailLevel) {
    await this.getOrCreateForUser(userId);

    return this.prisma.userSettings.update({
      where: { userId },
      data: { detailLevel },
      include: { defaultProjectContext: true },
    });
  }

  async updateDefaultProjectContext(
    userId: string,
    defaultProjectContextId: string,
  ) {
    await this.getOrCreateForUser(userId);

    return this.prisma.userSettings.update({
      where: { userId },
      data: { defaultProjectContextId },
      include: { defaultProjectContext: true },
    });
  }
}
