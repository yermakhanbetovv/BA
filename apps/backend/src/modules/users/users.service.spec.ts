import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const createPrismaMock = () =>
    ({
      user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    }) as unknown as PrismaService;

  it('creates or updates a Telegram user by Telegram ID', async () => {
    const prisma = createPrismaMock();
    const user = {
      id: '8f7dc83a-d547-41d7-9e49-4d0e8dfb7b9a',
      telegramId: 123456789n,
      username: 'ba_user',
      firstName: 'BA',
      lastName: 'User',
      telegramLanguageCode: 'ru',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSeenAt: new Date(),
    };
    jest.mocked(prisma.user.upsert).mockResolvedValue(user);
    const service = new UsersService(prisma);

    await expect(
      service.upsertTelegramUser({
        telegramId: '123456789',
        username: 'ba_user',
        firstName: 'BA',
        lastName: 'User',
        languageCode: 'ru',
      }),
    ).resolves.toBe(user);

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { telegramId: 123456789n },
        create: expect.objectContaining({
          telegramId: 123456789n,
          username: 'ba_user',
          telegramLanguageCode: 'ru',
        }),
        update: expect.objectContaining({
          username: 'ba_user',
          telegramLanguageCode: 'ru',
        }),
      }),
    );
  });

  it('throws when user is not found by id', async () => {
    const prisma = createPrismaMock();
    jest.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const service = new UsersService(prisma);

    await expect(service.findById('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
