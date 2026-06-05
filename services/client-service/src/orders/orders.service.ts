import {
  Injectable, NotFoundException, ForbiddenException,
  OnModuleInit, OnModuleDestroy, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientsService } from '../clients/clients.service';
import { KafkaService } from '../kafka/kafka.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private ordersRepo: Repository<Order>,
    private clientsService: ClientsService,
    private kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    const consumer = this.kafkaService.createConsumer('client-service-orders-group');
    try {
      await consumer.connect();
      await consumer.subscribe({
        topics: [
          'commandes.validated',
          'commandes.rejected',
          'commandes.planned',
          'commandes.in_transit',
          'commandes.delivered',
          'commandes.cancellation_requested',
          'commandes.cancelled',
          'commandes.cancellation_rejected',
        ],
        fromBeginning: false,
      });
      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          const data = JSON.parse(message.value.toString());
          if (topic === 'commandes.validated')               await this.onOrderValidated(data);
          if (topic === 'commandes.rejected')                await this.onOrderRejected(data);
          if (topic === 'commandes.planned')                 await this.onOrderStatusChanged(data, OrderStatus.PLANNED);
          if (topic === 'commandes.in_transit')              await this.onOrderStatusChanged(data, OrderStatus.IN_TRANSIT);
          if (topic === 'commandes.delivered')               await this.onOrderStatusChanged(data, OrderStatus.DELIVERED);
          if (topic === 'commandes.cancellation_requested')  await this.onOrderStatusChanged(data, OrderStatus.CANCELLATION_REQUESTED);
          if (topic === 'commandes.cancelled')               await this.onOrderStatusChanged(data, OrderStatus.CANCELLED);
          if (topic === 'commandes.cancellation_rejected')   await this.onOrderStatusChanged(data, OrderStatus.CANCELLATION_REJECTED);
        },
      });
      this.logger.log('Kafka consumer started for order events');
    } catch (err) {
      this.logger.error('Kafka consumer init failed', err.message);
    }
  }

  async onModuleDestroy() {}

  private generateChassisId(brand?: string, model?: string): string {
    const b = (brand ?? 'XX').substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X');
    const m = (model ?? 'XXX').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const year = new Date().getFullYear().toString().slice(2);
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${b}${m}${year}${rand}`;
  }

  private expandVehicles(items: { vehicleModelId?: string; vehicleModelLabel?: string; quantity: number }[]) {
    const expanded: { chassisId: string; vehicleModelId?: string; vehicleModelLabel?: string }[] = [];
    for (const item of items) {
      const parts = (item.vehicleModelLabel ?? '').split(' ');
      const brand = parts[0] ?? 'XX';
      const model = parts[1] ?? 'XXX';
      for (let i = 0; i < item.quantity; i++) {
        expanded.push({
          chassisId: this.generateChassisId(brand, model),
          vehicleModelId: item.vehicleModelId,
          vehicleModelLabel: item.vehicleModelLabel,
        });
      }
    }
    return expanded;
  }

  async create(user: JwtUser, dto: CreateOrderDto): Promise<Order> {
    const client = await this.clientsService.findOrCreate(user);

    const deliveryAddress = dto.deliveryAddress ?? client.deliveryAddress;
    if (!deliveryAddress) {
      throw new ForbiddenException(
        'Veuillez renseigner une adresse de livraison',
      );
    }

    const coords = await this.geocode(deliveryAddress);

    // Expand quantity-based items into individual chassis entries with auto-generated IDs
    const vehicles = this.expandVehicles(dto.vehicles);

    const order = this.ordersRepo.create({
      clientId: client.id,
      vehicles,
      requestedDeliveryDate: new Date(dto.requestedDeliveryDate),
      deliveryAddress,
      deliveryLat: coords?.lat ?? null,
      deliveryLng: coords?.lng ?? null,
      status: OrderStatus.PENDING_VALIDATION,
    });

    const saved = await this.ordersRepo.save(order);

    await this.kafkaService.publish('commandes.created', {
      orderId: saved.id,
      clientId: user.keycloakId,        // Keycloak UUID pour lookup admin
      clientCode: client.clientCode,
      clientName: `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim(),
      clientCompany: client.company ?? '',
      vehicles: saved.vehicles,
      requestedDeliveryDate: saved.requestedDeliveryDate,
      deliveryAddress: saved.deliveryAddress,
      deliveryLat: saved.deliveryLat,
      deliveryLng: saved.deliveryLng,
      createdAt: saved.createdAt,
    });

    this.logger.log(`Order created: ${saved.id} for client ${client.clientCode}`);
    return saved;
  }

  private async geocode(address: Record<string, any>): Promise<{ lat: number; lng: number } | null> {
    try {
      const q = [address.street, address.city, address.postalCode, address.country]
        .filter(Boolean).join(', ');
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OptiFlow/1.0 (logistics-pfe)' },
        signal: AbortSignal.timeout(5000),
      });
      const data: any[] = await res.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      this.logger.warn(`Geocoding failed: ${err.message}`);
    }
    return null;
  }

  async findAll(user: JwtUser): Promise<Order[]> {
    const client = await this.clientsService.findOrCreate(user);
    return this.ordersRepo.find({
      where: { clientId: client.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(user: JwtUser, orderId: string): Promise<Order> {
    const client = await this.clientsService.findOrCreate(user);
    const order = await this.ordersRepo.findOne({
      where: { id: orderId, clientId: client.id },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  async requestCancellation(
    user: JwtUser,
    orderId: string,
    reason: string,
    vehicleChassisIds?: string[],
  ): Promise<Order> {
    const client = await this.clientsService.findOrCreate(user);
    const order = await this.ordersRepo.findOne({ where: { id: orderId, clientId: client.id } });
    if (!order) throw new NotFoundException('Commande introuvable');

    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING_VALIDATION,
      OrderStatus.VALIDATED,
      OrderStatus.PLANNED,
      OrderStatus.CANCELLATION_REJECTED, // allow retry after rejection
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new ForbiddenException(`Impossible d'annuler une commande en statut ${order.status}`);
    }

    // Determine which vehicles to cancel
    const allVehicles: any[] = Array.isArray(order.vehicles) ? order.vehicles : [];
    const requestedVehicles = vehicleChassisIds?.length
      ? allVehicles.filter((v: any) => vehicleChassisIds.includes(v.chassisId))
      : allVehicles;

    await this.kafkaService.publish('commandes.cancellation_requested', {
      orderId: order.id,
      clientId: user.keycloakId,        // Keycloak UUID pour lookup admin
      clientCode: client.clientCode,
      clientName: `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim(),
      clientCompany: client.company ?? '',
      allVehicles,
      requestedVehiclesJson: JSON.stringify(requestedVehicles),
      reason,
    });

    await this.ordersRepo.update(orderId, { status: OrderStatus.CANCELLATION_REQUESTED });
    order.status = OrderStatus.CANCELLATION_REQUESTED;
    this.logger.log(`Cancellation requested for order ${orderId} by client ${client.clientCode}`);
    return order;
  }

  private async onOrderValidated(data: {
    orderId: string;
    orderNumber: string;
    estimatedArrivalDate?: string;
    operatorNotes?: string;
  }) {
    try {
      await this.ordersRepo.update(data.orderId, {
        status: OrderStatus.VALIDATED,
        orderNumber: data.orderNumber,
        estimatedArrivalDate: data.estimatedArrivalDate
          ? new Date(data.estimatedArrivalDate)
          : undefined,
        operatorNotes: data.operatorNotes,
      });
      this.logger.log(`Order ${data.orderId} validated → ${data.orderNumber}`);
    } catch (err) {
      this.logger.error(`Failed to update validated order ${data.orderId}`, err.message);
    }
  }

  private async onOrderRejected(data: { orderId: string; reason?: string }) {
    try {
      await this.ordersRepo.update(data.orderId, {
        status: OrderStatus.REJECTED,
        rejectionReason: data.reason,
      });
      this.logger.log(`Order ${data.orderId} rejected`);
    } catch (err) {
      this.logger.error(`Failed to update rejected order ${data.orderId}`, err.message);
    }
  }

  private async onOrderStatusChanged(data: { orderId: string; tourneeNumber?: string }, status: OrderStatus) {
    try {
      await this.ordersRepo.update(data.orderId, { status });
      this.logger.log(`Order ${data.orderId} → ${status}`);
    } catch (err) {
      this.logger.error(`Failed to update order ${data.orderId} to ${status}`, err.message);
    }
  }
}
