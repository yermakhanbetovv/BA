import { BotSessionMode } from '@prisma/client';

import type { PrismaService } from '../../prisma/prisma.service';
import { BotSessionsService } from './bot-sessions.service';

describe('BotSessionsService', () => {
  it('creates bot session', async () => {
    const prisma = {
      botSession: {
        upsert: jest.fn().mockResolvedValue({ userId: 'user-id' }),
      },
    } as unknown as PrismaService;
    const service = new BotSessionsService(prisma);

    await service.getOrCreateForUser('user-id');

    expect(prisma.botSession.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      update: {},
      create: { userId: 'user-id' },
    });
  });

  it('changes mode', async () => {
    const prisma = {
      botSession: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new BotSessionsService(prisma);

    await service.setMode('user-id', BotSessionMode.WAITING_BUG);

    expect(prisma.botSession.update).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      data: { mode: BotSessionMode.WAITING_BUG },
    });
  });
});
