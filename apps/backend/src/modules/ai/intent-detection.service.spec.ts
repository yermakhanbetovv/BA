import { ArtifactType, DetailLevel, Language, Tone } from '@prisma/client';

import type { AiClientService } from './ai-client.service';
import { IntentDetectionService } from './intent-detection.service';

describe('IntentDetectionService', () => {
  const createService = () =>
    new IntentDetectionService({
      generateText: jest.fn().mockRejectedValue(new Error('no api')),
    } as unknown as AiClientService);

  const baseInput = {
    userSettings: {
      id: 'settings-id',
      userId: 'user-id',
      language: Language.RU,
      tone: Tone.SIMPLE,
      detailLevel: DetailLevel.MEDIUM,
      defaultProjectContextId: 'context-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      defaultProjectContext: null,
    },
    projectContext: {
      id: 'context-id',
      key: 'personal',
      name: 'Personal',
      description: 'desc',
      context: 'BA context',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  it('returns BUG for file name display issue', async () => {
    const service = createService();

    await expect(
      service.detectIntent({
        ...baseInput,
        inputText: 'не отображается имя файла',
      }),
    ).resolves.toMatchObject({ intent: ArtifactType.BUG });
  });

  it('returns DAILY for daily-like text', async () => {
    const service = createService();

    await expect(
      service.detectIntent({
        ...baseInput,
        inputText: 'завел 2 бага жду фидбек',
      }),
    ).resolves.toMatchObject({ intent: ArtifactType.DAILY });
  });
});
