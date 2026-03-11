import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  age?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  investExp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  investStyle?: string;

  @IsOptional()
  @IsBoolean()
  showAge?: boolean;

  @IsOptional()
  @IsBoolean()
  showGender?: boolean;

  @IsOptional()
  @IsBoolean()
  showInvestExp?: boolean;

  @IsOptional()
  @IsBoolean()
  showInvestStyle?: boolean;

  @IsOptional()
  @IsBoolean()
  thirdPartyConsent?: boolean;
}
