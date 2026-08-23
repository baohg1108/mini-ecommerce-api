import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderResponseDto } from './dtos/order.response.dto';
import { OrderItemResponseDto } from './dtos/order-item.response.dto';
import { SellerOrderListQueryDto } from './dtos/seller-order-list-query.dto';
import {
  OrderCustomerDto,
  SellerOrderItemDto,
  SellerOrderListMetaDto,
  SellerOrderListResponseDto,
} from './dtos/seller-order-list.response.dto';
import { PaymentResponseDto } from '../payment/dtos/payment.response.dto';
import { PaymentService } from '../payment/payment.service';
import { CartService } from '../cart/cart.service';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { GroupedCartDto } from '../cart/dtos/grouped-cart.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    private readonly cartService: CartService,
    private readonly paymentService: PaymentService,
    private readonly dataSource: DataSource,
  ) {}

  async checkout(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<OrderResponseDto[]> {
    const groupedCart =
      await this.cartService.getGroupedCartForCheckout(userId);

    if (!groupedCart.length) {
      throw new BadRequestException('Cart is empty');
    }

    for (const group of groupedCart) {
      const unavailable = group.items.find(
        (item) => item.stockQty === undefined || item.quantity > item.stockQty,
      );
      if (unavailable) {
        throw new BadRequestException(
          `Insufficient stock for product ${unavailable.productName}`,
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const createdOrders: Order[] = [];

      for (const group of groupedCart) {
        const order = await this.createOrderForShop(
          manager,
          userId,
          group,
          dto,
        );
        createdOrders.push(order);
      }

      const cart = await manager.findOne(Cart, { where: { userId } });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      const purchasedVariantIds = groupedCart.flatMap((g) =>
        g.items.map((i) => i.variantId),
      );

      if (purchasedVariantIds.length) {
        await manager.delete(CartItem, {
          cartId: cart.id,
          variantId: In(purchasedVariantIds),
        });
      }

      return createdOrders.map((order) => this.toOrderResponse(order));
    });
  }

  private async createOrderForShop(
    manager: EntityManager,
    userId: string,
    group: GroupedCartDto,
    dto: CreateOrderDto,
  ): Promise<Order> {
    let subtotal = 0;
    const orderItemsData: Partial<OrderItem>[] = [];

    for (const cartItem of group.items) {
      const variant = await manager
        .createQueryBuilder(ProductVariant, 'variant')
        .where('variant.id = :id', { id: cartItem.variantId })
        .setLock('pessimistic_write')
        .getOne();

      if (!variant) {
        throw new NotFoundException(
          `Product variant ${cartItem.variantId} not found`,
        );
      }

      if (cartItem.quantity > variant.availableQty) {
        throw new BadRequestException(
          `Insufficient stock for ${cartItem.productName}. Only ${variant.availableQty} left.`,
        );
      }

      variant.reservedQty = (variant.reservedQty ?? 0) + cartItem.quantity;
      await manager.save(ProductVariant, variant);

      const price = Number(cartItem.price ?? 0);
      const lineTotal = price * cartItem.quantity;
      subtotal += lineTotal;

      orderItemsData.push({
        variantId: variant.id,
        productNameSnapshot: cartItem.productName ?? '',
        variantAttributesSnapshot: variant.attributes ?? {},
        quantity: cartItem.quantity,
        priceAtOrder: price.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      });
    }

    const shippingFee = 0;
    const discount = 0;
    const totalAmount = subtotal - discount + shippingFee;

    const order = manager.create(Order, {
      orderCode: this.generateOrderCode(),
      userId,
      shopId: group.shop.id,
      shippingRecipientName: dto.address.recipientName,
      shippingPhone: dto.address.phone,
      shippingFullAddress: dto.address.fullAddress,
      subtotalAmount: subtotal.toFixed(2),
      discountAmount: discount.toFixed(2),
      shippingFee: shippingFee.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paymentMethod: dto.paymentMethod,
      status:
        dto.paymentMethod === PaymentMethod.COD
          ? OrderStatus.PENDING_CONFIRMATION
          : OrderStatus.PENDING_PAYMENT,
      note: dto.note,
    });

    const savedOrder = await manager.save(Order, order);

    const items = orderItemsData.map((data) =>
      manager.create(OrderItem, { ...data, orderId: savedOrder.id }),
    );
    savedOrder.items = await manager.save(OrderItem, items);

    savedOrder.payment = await this.paymentService.createForOrder(
      manager,
      savedOrder,
      dto.paymentMethod,
    );

    return savedOrder;
  }

  async findById(id: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You are not allowed to view this order');
    }

    return this.toOrderResponse(order);
  }

  async findMyOrders(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: { items: true, payment: true },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => this.toOrderResponse(order));
  }

  async getShopOrders(
    sellerId: string,
    query: SellerOrderListQueryDto,
  ): Promise<SellerOrderListResponseDto> {
    const shop = await this.shopRepository.findOne({
      where: { userId: sellerId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found for this seller');
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.shop_id = :shopId', { shopId: shop.id });

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    qb.orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, totalItems] = await qb.getManyAndCount();

    const items = orders.map((order) => this.toSellerOrderItem(order));

    const meta: SellerOrderListMetaDto = {
      page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    };

    return new SellerOrderListResponseDto(items, meta);
  }

  private toSellerOrderItem(order: Order): SellerOrderItemDto {
    return new SellerOrderItemDto({
      orderId: order.id,
      customer: new OrderCustomerDto({
        id: order.user?.id,
        fullName: order.user?.fullName,
        phone: order.user?.phone,
      }),
      items: (order.items ?? []).map(
        (item) =>
          new OrderItemResponseDto({
            id: item.id,
            variantId: item.variantId,
            productName: item.productNameSnapshot,
            quantity: item.quantity,
            priceAtOrder: item.priceAtOrder,
            lineTotal: item.lineTotal,
          }),
      ),
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: order.createdAt,
    });
  }

  private generateOrderCode(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `ORD${datePart}${randomPart}`;
  }

  private toOrderResponse(order: Order): OrderResponseDto {
    return new OrderResponseDto({
      id: order.id,
      orderCode: order.orderCode,
      shopId: order.shopId,
      status: order.status,
      paymentMethod: order.paymentMethod,
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      shippingFee: order.shippingFee,
      totalAmount: order.totalAmount,
      items: (order.items ?? []).map(
        (item) =>
          new OrderItemResponseDto({
            id: item.id,
            variantId: item.variantId,
            productName: item.productNameSnapshot,
            quantity: item.quantity,
            priceAtOrder: item.priceAtOrder,
            lineTotal: item.lineTotal,
          }),
      ),
      payment: order.payment
        ? new PaymentResponseDto({
            id: order.payment.id,
            orderId: order.payment.orderId,
            method: order.payment.method,
            status: order.payment.status,
            amount: order.payment.amount,
            gatewayTxnId: order.payment.gatewayTxnId,
            paidAt: order.payment.paidAt,
          })
        : undefined,
      createdAt: order.createdAt,
    });
  }
}
