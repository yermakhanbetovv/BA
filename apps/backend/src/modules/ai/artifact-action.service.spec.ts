import { ArtifactType, DetailLevel, Language, Tone } from '@prisma/client';

import type { ArtifactsService } from '../artifacts/artifacts.service';
import type { AiClientService } from './ai-client.service';
import { ArtifactActionService } from './artifact-action.service';
import type { PromptBuilderService } from './prompt-builder.service';

describe('ArtifactActionService', () => {
  it('calls AI with action prompt and saves new artifact', async () => {
    const sourceArtifact = {
      id: 'source-id',
      userId: 'user-id',
      projectContextId: 'context-id',
      type: ArtifactType.BUG,
      inputText: 'сырой текст',
      outputText: 'длинный bug report',
      status: 'GENERATED',
      qualityScore: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectContext: {
        id: 'context-id',
        key: 'personal',
        name: 'Personal',
        description: 'desc',
        context: 'context',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    const artifactsService = {
      getArtifactById: jest.fn().mockResolvedValue(sourceArtifact),
      createArtifact: jest.fn().mockResolvedValue({ id: 'new-id' }),
    } as unknown as ArtifactsService;
    const aiClient = {
      generateText: jest.fn().mockResolvedValue('короткий bug report'),
    } as unknown as AiClientService;
    const promptBuilder = {
      buildArtifactPrompt: jest.fn().mockReturnValue('action prompt'),
    } as unknown as PromptBuilderService;
    const service = new ArtifactActionService(
      aiClient,
      artifactsService,
      promptBuilder,
    );

    await service.shorten('source-id', {
      id: 'settings-id',
      userId: 'user-id',
      language: Language.RU,
      tone: Tone.SIMPLE,
      detailLevel: DetailLevel.MEDIUM,
      defaultProjectContextId: 'context-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      defaultProjectContext: null,
    });

    expect(promptBuilder.buildArtifactPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ actionInstruction: expect.any(String) }),
    );
    expect(artifactsService.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        inputText: 'сырой текст',
        outputText: 'короткий bug report',
      }),
    );
  });
});
