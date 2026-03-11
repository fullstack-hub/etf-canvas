import { IsArray, IsNumber, IsString, IsOptional, ArrayMinSize, ArrayMaxSize, Min } from 'class-validator';

export class CompareDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  codes!: string[];
}

export class SimulateDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  codes!: string[];

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  weights!: number[];

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  period!: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
