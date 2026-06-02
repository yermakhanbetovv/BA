import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertTelegramUserDto {
  @IsNumberString()
  telegramId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  languageCode?: string;
}
