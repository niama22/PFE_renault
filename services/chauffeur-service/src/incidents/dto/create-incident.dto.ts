import { IsString, IsEnum, IsUUID, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentSeverity } from '../entities/incident.entity';

export class CreateIncidentDto {
  @ApiProperty()
  @IsUUID()
  missionId: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  description: string;

  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;
}
