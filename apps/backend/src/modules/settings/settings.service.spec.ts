import { DetailLevel, Language, Tone } from '@prisma/client';

import type { PrismaService } from '../../prisma/prisma.service';
import type { ProjectContextsService } from '../project-contexts/project-contexts.service';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const defaultContext = {
    id: 'context-id',
    key: 'personal',
    name: 'Personal',
    description: 'Default',
    context: 'BA context',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createService = () => {
    const prisma = {
      userSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const projectContextsService = {
      getDefaultContext: jest.fn().mockResolvedValue(defaultContext),
    } as unknown as ProjectContextsService;

    return {
      prisma,
      service: new SettingsService(prisma, projectContextsService),
    };
  };

  it('creates default settings for user', async () => {
    const { prisma, service } = createService();
    jest.mocked(prisma.userSettings.findUnique).mockResolvedValue(null);
    jest.mocked(prisma.userSettings.create).mockResolvedValue({
      id: 'settings-id',
      userId: 'user-id',
      language: Language.RU,
      tone: Tone.SIMPLE,
      detailLevel: DetailLevel.MEDIUM,
      defaultProjectContextId: defaultContext.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.getOrCreateForUser('user-id');

    expect(prisma.userSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'user-id',
          defaultProjectContextId: defaultContext.id,
        },
      }),
    );
  });

  it('updates default project context', async () => {
    const { prisma, service } = createService();
    jest.mocked(prisma.userSettings.findUnique).mockResolvedValue({
      id: 'settings-id',
      userId: 'user-id',
      language: Language.RU,
      tone: Tone.SIMPLE,
      detailLevel: DetailLevel.MEDIUM,
      defaultProjectContextId: defaultContext.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jest.mocked(prisma.userSettings.update).mockResolvedValue({
      id: 'settings-id',
      userId: 'user-id',
      language: Language.RU,
      tone: Tone.SIMPLE,
      detailLevel: DetailLevel.MEDIUM,
      defaultProjectContextId: 'new-context-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.updateDefaultProjectContext('user-id', 'new-context-id');

    expect(prisma.userSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { defaultProjectContextId: 'new-context-id' },
      }),
    );
  });
});
