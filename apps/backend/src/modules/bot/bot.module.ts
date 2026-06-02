import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { BotSessionsModule } from '../bot-sessions/bot-sessions.module';
import { ProjectContextsModule } from '../project-contexts/project-contexts.module';
import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';
import { BotService } from './bot.service';

@Module({
  imports: [
    UsersModule,
    SettingsModule,
    ProjectContextsModule,
    ArtifactsModule,
    BotSessionsModule,
    AiModule,
  ],
  providers: [BotService],
})
export class BotModule {}
