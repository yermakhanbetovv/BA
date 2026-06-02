import { ArtifactStatus, ArtifactType } from '@prisma/client';

import type { ArtifactsService } from '../artifacts/artifacts.service';
import type { AiClientService } from './ai-client.service';
import { AiServiceError } from './ai.errors';
import { ArtifactGenerationService } from './artifact-generation.service';
import type { PromptBuilderService } from './prompt-builder.service';

describe('ArtifactGenerationService', () => {
  const baseInput = {
    userId: 'user-id',
    inputText: 'не отображается имя файла',
    artifactType: ArtifactType.BUG,
    userSettings: {
      id: 'settings-id',
      userId: 'user-id',
      language: 'RU',
      tone: 'SIMPLE',
      detailLevel: 'MEDIUM',
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
      context: 'context',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } as const;

  it('saves artifact after successful generation', async () => {
    const aiClient = {
      generateText: jest.fn().mockResolvedValue('Bug...'),
    } as unknown as AiClientService;
    const artifactsService = {
      createArtifact: jest.fn().mockResolvedValue({ id: 'artifact-id' }),
    } as unknown as ArtifactsService;
    const promptBuilder = {
      buildArtifactPrompt: jest.fn().mockReturnValue('prompt'),
    } as unknown as PromptBuilderService;
    const service = new ArtifactGenerationService(
      aiClient,
      artifactsService,
      promptBuilder,
    );

    await service.generateArtifact(baseInput);

    expect(artifactsService.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        type: ArtifactType.BUG,
        outputText: 'Bug...',
      }),
    );
  });

  it('stores failed artifact when Gemini fails', async () => {
    const aiClient = {
      generateText: jest.fn().mockRejectedValue(new AiServiceError()),
    } as unknown as AiClientService;
    const artifactsService = {
      createArtifact: jest.fn().mockResolvedValue({ id: 'failed-id' }),
    } as unknown as ArtifactsService;
    const promptBuilder = {
      buildArtifactPrompt: jest.fn().mockReturnValue('prompt'),
    } as unknown as PromptBuilderService;
    const service = new ArtifactGenerationService(
      aiClient,
      artifactsService,
      promptBuilder,
    );

    await expect(service.generateArtifact(baseInput)).rejects.toBeInstanceOf(
      AiServiceError,
    );
    expect(artifactsService.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ status: ArtifactStatus.FAILED }),
    );
  });
});
