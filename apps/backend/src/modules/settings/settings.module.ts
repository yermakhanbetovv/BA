import { Module } from '@nestjs/common';

import { ProjectContextsModule } from '../project-contexts/project-contexts.module';
import { SettingsService } from './settings.service';

@Module({
  imports: [ProjectContextsModule],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
