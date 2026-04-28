import { IsArray, IsDateString, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class CreatePostDto {
  @IsString()
  content!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  accountIds!: string[];

  // ISO 8601. If omitted, the post is saved as a draft.
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
