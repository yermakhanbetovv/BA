import { Injectable, Logger } from '@nestjs/common';
import { ArtifactStatus } from '@prisma/client';

import { ArtifactsService } from '../artifacts/artifacts.service';
import { AiClientService } from './ai-client.service';
import { ArtifactGenerationInput, ArtifactGenerationResult } from './ai.types';
import { PromptBuilderService } from './prompt-builder.service';

@Injectable()
export class ArtifactGenerationService {
  private readonly logger = new Logger(ArtifactGenerationService.name);

  constructor(
    private readonly aiClient: AiClientService,
    private readonly artifactsService: ArtifactsService,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  async generateArtifact(
    input: ArtifactGenerationInput,
  ): Promise<ArtifactGenerationResult> {
    const prompt = this.promptBuilder.buildArtifactPrompt({
      artifactType: input.artifactType,
      inputText: input.inputText,
      userSettings: input.userSettings,
      projectContext: input.projectContext,
    });

    try {
      const outputText = await this.aiClient.generateText([
        { role: 'user', content: prompt },
      ]);
      const artifact = await this.artifactsService.createArtifact({
        userId: input.userId,
        projectContextId: input.projectContext.id,
        type: input.artifactType,
        inputText: input.inputText,
        outputText,
        metadata: input.metadata,
      });

      return { artifact, outputText };
    } catch (error) {
      this.logger.warn(
        'Artifact generation failed',
        error instanceof Error ? error.message : undefined,
      );
      await this.artifactsService.createArtifact({
        userId: input.userId,
        projectContextId: input.projectContext.id,
        type: input.artifactType,
        inputText: input.inputText,
        outputText: error instanceof Error ? error.message : 'AI generation failed',
        status: ArtifactStatus.FAILED,
        metadata: {
          originalMetadata: input.metadata,
          error: error instanceof Error ? error.name : 'UnknownError',
        },
      });
      throw error;
    }
  }
}
