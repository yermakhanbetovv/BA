import { Module } from '@nestjs/common';

import { ArtifactsModule } from '../artifacts/artifacts.module';
import { AiClientService } from './ai-client.service';
import { ArtifactActionService } from './artifact-action.service';
import { ArtifactGenerationService } from './artifact-generation.service';
import { IntentDetectionService } from './intent-detection.service';
import { PromptBuilderService } from './prompt-builder.service';

@Module({
  imports: [ArtifactsModule],
  providers: [
    AiClientService,
    IntentDetectionService,
    ArtifactGenerationService,
    ArtifactActionService,
    PromptBuilderService,
  ],
  exports: [
    IntentDetectionService,
    ArtifactGenerationService,
    ArtifactActionService,
    PromptBuilderService,
    AiClientService,
  ],
})
export class AiModule {}
