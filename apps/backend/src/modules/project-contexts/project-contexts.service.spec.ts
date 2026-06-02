import type { PrismaService } from '../../prisma/prisma.service';
import { ProjectContextsService } from './project-contexts.service';

describe('ProjectContextsService', () => {
  it('returns project context list', async () => {
    const prisma = {
      projectContext: {
        findMany: jest.fn().mockResolvedValue([{ key: 'personal' }]),
      },
    } as unknown as PrismaService;
    const service = new ProjectContextsService(prisma);

    await expect(service.findAll()).resolves.toEqual([{ key: 'personal' }]);
    expect(prisma.projectContext.findMany).toHaveBeenCalledWith({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  });

  it('selects context for user', async () => {
    const prisma = {
      projectContext: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ctx', key: 'personal' }),
      },
      userSettings: {
        upsert: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new ProjectContextsService(prisma);

    await service.selectForUser('user-id', 'personal');

    expect(prisma.userSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-id' },
        update: { defaultProjectContextId: 'ctx' },
      }),
    );
  });
});
