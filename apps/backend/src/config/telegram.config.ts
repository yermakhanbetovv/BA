import { registerAs } from '@nestjs/config';

export const telegramConfig = registerAs('telegram', () => ({
  token: process.env.TELEGRAM_BOT_TOKEN,
  enabled: process.env.TELEGRAM_BOT_ENABLED === 'true',
}));
