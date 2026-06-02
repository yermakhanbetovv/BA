import { ArtifactStatus, ArtifactType } from '@prisma/client';

import type { PrismaService } from '../../prisma/prisma.service';
import type { ProjectContextsService } from '../project-contexts/project-contexts.service';
import { ArtifactsService } from './artifacts.service';

describe('ArtifactsService', () => {
  it('saves artifact', async () => {
    const prisma = {
      userSettings: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      artifact: { create: jest.fn().mockResolvedValue({ id: 'artifact-id' }) },
    } as unknown as PrismaService;
    const projectContextsService = {
      getDefaultContext: jest.fn().mockResolvedValue({ id: 'context-id' }),
    } as unknown as ProjectContextsService;
    const service = new ArtifactsService(prisma, projectContextsService);

    await service.createArtifact({
      userId: 'user-id',
      type: ArtifactType.BUG,
      inputText: 'не отображается имя файла',
      outputText: 'Bug...',
    });

    expect(prisma.artifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-id',
          projectContextId: 'context-id',
          status: undefined,
        }),
      }),
    );
  });

  it('marks artifact as saved', async () => {
    const prisma = {
      artifact: {
        findUnique: jest.fn().mockResolvedValue({ id: 'artifact-id' }),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new ArtifactsService(
      prisma,
      {} as unknown as ProjectContextsService,
    );

    await service.saveArtifact('artifact-id');

    expect(prisma.artifact.update).toHaveBeenCalledWith({
      where: { id: 'artifact-id' },
      data: { status: ArtifactStatus.SAVED },
    });
  });
});
