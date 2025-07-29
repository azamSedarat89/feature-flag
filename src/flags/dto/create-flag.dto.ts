import { IsString, IsOptional, IsArray, ArrayUnique } from 'class-validator';

export class CreateFlagDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  dependencies?: string[];
}
