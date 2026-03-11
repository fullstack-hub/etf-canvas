import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, MaxLength, MinLength, Min, Max, ArrayMinSize, ArrayMaxSize, IsObject } from 'class-validator';

export class PortfolioItemDto {
  @IsString()
  @MaxLength(10)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

class FeedbackActionDto {
  @IsString()
  category!: string;

  @IsString()
  label!: string;
}

class FeedbackDto {
  @IsString()
  feedback!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeedbackActionDto)
  actions!: FeedbackActionDto[];

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsString()
  snippet!: string;
}

export class FeedbackRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  items!: PortfolioItemDto[];
}

export class AutoSaveDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  items!: PortfolioItemDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FeedbackDto)
  feedback!: FeedbackDto | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
}

export class CreatePortfolioDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  items!: PortfolioItemDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FeedbackDto)
  feedback?: FeedbackDto | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
}

export class RenamePortfolioDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
