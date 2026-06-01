import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GpsUpdateDto {
  @ApiProperty({ example: 48.8566, description: 'Latitude WGS84' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 2.3522, description: 'Longitude WGS84' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 65.5, description: 'Vitesse en km/h' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ example: 'mission-uuid', description: 'ID de la mission en cours' })
  @IsOptional()
  @IsString()
  missionId?: string;
}
