import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { envSchema } from './config/env.schema';
import { geminiConfig } from './config/gemini.config';
import { telegramConfig } from './config/telegram.config';
import { AiModule } from './modules/ai/ai.module';
import { ArtifactsModule } from './modules/artifacts/artifacts.module';
import { BotModule } from './modules/bot/bot.module';
import { HealthModule } from './modules/health/health.module';
import { ProjectContextsModule } from './modules/project-contexts/project-contexts.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [appConfig, databaseConfig, geminiConfig, telegramConfig],
      validate: (env) => envSchema.parse(env),
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    ProjectContextsModule,
    SettingsModule,
    ArtifactsModule,
    AiModule,
    BotModule,
  ],
})
export class AppModule {}
