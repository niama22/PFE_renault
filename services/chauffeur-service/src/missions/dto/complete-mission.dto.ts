import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteMissionDto {
  @ApiPropertyOptional({ example: 'Livraison effectuée sans problème' })
  @IsOptional()
  @IsString()
  notes?: string;
}
