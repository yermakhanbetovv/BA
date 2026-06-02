import { Module } from '@nestjs/common';

import { ProjectContextsService } from './project-contexts.service';

@Module({
  providers: [ProjectContextsService],
  exports: [ProjectContextsService],
})
export class ProjectContextsModule {}
