import { Module } from '@nestjs/common';

import { ProjectContextsModule } from '../project-contexts/project-contexts.module';
import { ArtifactsService } from './artifacts.service';

@Module({
  imports: [ProjectContextsModule],
  providers: [ArtifactsService],
  exports: [ArtifactsService],
})
export class ArtifactsModule {}
