import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { UpdateProfileDto, UpdateAddressDto } from './dto/update-profile.dto';
import { JwtUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepo: Repository<Client>,
  ) {}

  async findOrCreate(user: JwtUser): Promise<Client> {
    let client = await this.clientsRepo.findOne({ where: { keycloakId: user.keycloakId } });

    if (!client) {
      client = this.clientsRepo.create({
        keycloakId: user.keycloakId,
        clientCode: user.clientCode || user.username,
        firstName: user.username,
        lastName: '',
        email: user.email || `${user.username}@optiflow.local`,
      });
      await this.clientsRepo.save(client);
    }

    return client;
  }

  async getProfile(keycloakId: string): Promise<Client> {
    const client = await this.clientsRepo.findOne({ where: { keycloakId } });
    if (!client) throw new NotFoundException('Profil client introuvable');
    return client;
  }

  async updateProfile(keycloakId: string, dto: UpdateProfileDto): Promise<Client> {
    const client = await this.getProfile(keycloakId);
    Object.assign(client, dto);
    return this.clientsRepo.save(client);
  }

  async updateDeliveryAddress(keycloakId: string, dto: UpdateAddressDto): Promise<Client> {
    const client = await this.getProfile(keycloakId);
    client.deliveryAddress = { ...client.deliveryAddress, ...dto };
    return this.clientsRepo.save(client);
  }
}
