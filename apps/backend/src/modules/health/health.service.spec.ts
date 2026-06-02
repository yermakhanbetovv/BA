import { HealthService } from './health.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('HealthService', () => {
  it('returns basic health status', () => {
    const prisma = { $queryRaw: jest.fn() } as unknown as PrismaService;
    const service = new HealthService(prisma);

    expect(service.getHealth()).toMatchObject({
      status: 'ok',
      service: 'ba-copilot-backend',
    });
  });

  it('checks database readiness', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'ready',
      checks: {
        database: 'ok',
      },
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
