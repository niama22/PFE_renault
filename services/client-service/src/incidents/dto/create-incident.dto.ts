import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIncidentDto {
  @ApiPropertyOptional({ description: 'ID de la commande concernée' })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Description de l\'anomalie constatée' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({ description: 'URLs des pièces jointes' })
  @IsArray()
  @IsOptional()
  attachments?: string[];
}
