import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectContextsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.projectContext.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findByKey(key: string) {
    const projectContext = await this.prisma.projectContext.findUnique({
      where: { key },
    });

    if (!projectContext) {
      throw new NotFoundException('Project context not found');
    }

    return projectContext;
  }

  async getDefaultContext() {
    const defaultContext = await this.prisma.projectContext.findFirst({
      where: { isDefault: true },
    });

    if (defaultContext) {
      return defaultContext;
    }

    const personalContext = await this.prisma.projectContext.findUnique({
      where: { key: 'personal' },
    });

    if (personalContext) {
      return personalContext;
    }

    const firstContext = await this.prisma.projectContext.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!firstContext) {
      throw new NotFoundException('Project contexts are not seeded');
    }

    return firstContext;
  }

  async selectForUser(userId: string, key: string) {
    const projectContext = await this.findByKey(key);

    await this.prisma.userSettings.upsert({
      where: { userId },
      update: {
        defaultProjectContextId: projectContext.id,
      },
      create: {
        userId,
        defaultProjectContextId: projectContext.id,
      },
    });

    return projectContext;
  }
}
