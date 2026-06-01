import {
  IsArray, IsDateString, IsString, IsOptional, IsUUID,
  IsNotEmpty, ValidateNested, ArrayMinSize, IsInt, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VehicleItemDto {
  @ApiProperty({ example: 'uuid-du-modele', description: 'ID du modèle de véhicule' })
  @IsOptional()
  @IsUUID()
  vehicleModelId?: string;

  @ApiProperty({ example: 'Dacia Sandero', description: 'Label lisible du modèle' })
  @IsOptional()
  @IsString()
  vehicleModelLabel?: string;

  @ApiProperty({ example: 2, description: 'Nombre de véhicules commandés de ce modèle' })
  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;
}

export class DeliveryAddressDto {
  @IsString() @IsNotEmpty() street: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() postalCode: string;
  @IsString() @IsNotEmpty() country: string;
}

export class CreateOrderDto {
  @ApiProperty({
    type: [VehicleItemDto],
    example: [
      { vehicleModelId: 'uuid', vehicleModelLabel: 'Dacia Sandero', quantity: 3 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VehicleItemDto)
  vehicles: VehicleItemDto[];

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  requestedDeliveryDate: string;

  @ApiProperty({ description: 'Adresse de livraison' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;
}
