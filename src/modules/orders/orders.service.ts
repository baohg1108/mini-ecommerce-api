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
import { Payment } from '../payment/entities/payment.entity';
import { CartService } from '../cart/cart.service';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { ProductVariantService } from '../product-variant/product-variant.service';
import { GroupedCartDto } from '../cart/dtos/grouped-cart.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { VoucherValidationService } from '../vouchers/voucher-validation.service';
import { ShopVoucherAllocation } from '../vouchers/interfaces/voucher-validation-result.interface';
import { AdminOrderQueryDto } from './dtos/admin-order-query.dto';

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
    private readonly productVariantService: ProductVariantService,
    private readonly voucherValidationService: VoucherValidationService,
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
    const voucherCodes = dto.voucherCodes ?? [];
    const voucherApplication = voucherCodes.length
      ? await this.voucherValidationService.applyVouchersToCart(
          voucherCodes,
          userId,
          groupedCart,
        )
      : undefined;

    return this.dataSource.transaction(async (manager) => {
      const createdOrders: Order[] = [];
      const usagesToRecord: Array<{
        voucherId: string;
        discountAmount: number;
        orderId: string;
      }> = [];

      let systemUsageOrderId: string | undefined;
      let systemUsageTotalDiscount = 0;

      for (const group of groupedCart) {
        const allocation = voucherApplication?.shopAllocations.find(
          (a) => a.shopId === group.shop.id,
        );

        const { order, usages } = await this.createOrderForShop(
          manager,
          userId,
          group,
          dto,
          allocation,
          voucherApplication?.systemVoucher,
        );
        createdOrders.push(order);

        for (const usage of usages) {
          if (
            usage.voucherId === voucherApplication?.systemVoucher?.voucher.id
          ) {
            systemUsageOrderId ??= usage.orderId;
            systemUsageTotalDiscount += usage.discountAmount;
            continue;
          }
          usagesToRecord.push(usage);
        }
      }

      if (voucherApplication?.systemVoucher && systemUsageOrderId) {
        usagesToRecord.push({
          voucherId: voucherApplication.systemVoucher.voucher.id,
          discountAmount: systemUsageTotalDiscount,
          orderId: systemUsageOrderId,
        });
      }

      for (const usage of usagesToRecord) {
        await this.voucherValidationService.recordUsage(
          manager,
          usage.voucherId,
          userId,
          usage.orderId,
          usage.discountAmount,
        );
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
    allocation?: ShopVoucherAllocation,
    systemVoucher?: { voucher: { id: string; code: string } },
  ): Promise<{
    order: Order;
    usages: Array<{
      voucherId: string;
      discountAmount: number;
      orderId: string;
    }>;
  }> {
    let subtotal = 0;
    const orderItemsData: Partial<OrderItem>[] = [];

    const sortedItems = [...group.items].sort((a, b) =>
      a.variantId.localeCompare(b.variantId),
    );

    for (const cartItem of sortedItems) {
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

    const shopVoucher = allocation?.shopVoucher;
    const shopDiscount = shopVoucher?.discountAmount ?? 0;
    const systemDiscount = allocation?.systemDiscountAllocated ?? 0;
    const discount = shopDiscount + systemDiscount;

    const appliedVoucherId =
      shopVoucher?.voucher.id ?? systemVoucher?.voucher.id;
    const appliedVoucherCode =
      shopVoucher?.voucher.code ?? systemVoucher?.voucher.code;

    const usages: Array<{
      voucherId: string;
      discountAmount: number;
      orderId: string;
    }> = [];

    const shippingFee = 0;
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
      voucherId: appliedVoucherId,
      voucherCode: appliedVoucherCode,
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

    if (shopVoucher && shopDiscount > 0) {
      usages.push({
        voucherId: shopVoucher.voucher.id,
        discountAmount: shopDiscount,
        orderId: savedOrder.id,
      });
    }
    if (systemVoucher && systemDiscount > 0) {
      usages.push({
        voucherId: systemVoucher.voucher.id,
        discountAmount: systemDiscount,
        orderId: savedOrder.id,
      });
    }

    return { order: savedOrder, usages };
  }
  async confirmOrder(
    orderId: string,
    sellerUserId: string,
  ): Promise<OrderResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrderForSeller(
        manager,
        orderId,
        sellerUserId,
      );

      const isCod = order.paymentMethod === PaymentMethod.COD;

      if (isCod && order.status !== OrderStatus.PENDING_CONFIRMATION) {
        throw new BadRequestException(
          `COD order is not pending confirmation (current status: ${order.status})`,
        );
      }

      if (!isCod && order.status !== OrderStatus.PAID_PENDING_CONFIRMATION) {
        throw new BadRequestException(
          `Order is not paid/pending confirmation (current status: ${order.status})`,
        );
      }

      if (isCod) {
        for (const item of order.items) {
          await this.productVariantService.commitStock(
            manager,
            item.variantId,
            item.quantity,
          );
        }
      }

      order.status = OrderStatus.CONFIRMED;
      order.confirmedAt = new Date();

      const saved = await manager.save(Order, order);
      return this.toOrderResponse(saved);
    });
  }

  async markPreparing(
    orderId: string,
    sellerUserId: string,
  ): Promise<OrderResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrderForSeller(
        manager,
        orderId,
        sellerUserId,
      );

      this.assertTransition(order.status, OrderStatus.PREPARING, [
        OrderStatus.CONFIRMED,
      ]);

      order.status = OrderStatus.PREPARING;
      const saved = await manager.save(Order, order);
      return this.toOrderResponse(saved);
    });
  }

  async markShipping(
    orderId: string,
    sellerUserId: string,
  ): Promise<OrderResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrderForSeller(
        manager,
        orderId,
        sellerUserId,
      );

      this.assertTransition(order.status, OrderStatus.SHIPPING, [
        OrderStatus.PREPARING,
      ]);

      order.status = OrderStatus.SHIPPING;
      order.shippedAt = new Date();
      const saved = await manager.save(Order, order);
      return this.toOrderResponse(saved);
    });
  }

  async markDelivered(
    orderId: string,
    sellerUserId: string,
  ): Promise<OrderResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrderForSeller(
        manager,
        orderId,
        sellerUserId,
      );

      this.assertTransition(order.status, OrderStatus.DELIVERED, [
        OrderStatus.SHIPPING,
      ]);

      order.status = OrderStatus.DELIVERED;
      order.deliveredAt = new Date();
      const saved = await manager.save(Order, order);
      return this.toOrderResponse(saved);
    });
  }

  async completeOrder(
    orderId: string,
    sellerUserId: string,
  ): Promise<OrderResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrderForSeller(
        manager,
        orderId,
        sellerUserId,
      );

      this.assertTransition(order.status, OrderStatus.COMPLETED, [
        OrderStatus.DELIVERED,
      ]);

      order.status = OrderStatus.COMPLETED;
      order.completedAt = new Date();
      const saved = await manager.save(Order, order);
      return this.toOrderResponse(saved);
    });
  }

  async cancelOrder(
    orderId: string,
    sellerUserId: string,
    reason?: string,
  ): Promise<OrderResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrderForSeller(
        manager,
        orderId,
        sellerUserId,
      );

      this.assertTransition(order.status, OrderStatus.CANCELLED, [
        OrderStatus.PENDING_CONFIRMATION,
        OrderStatus.PAID_PENDING_CONFIRMATION,
        OrderStatus.CONFIRMED,
      ]);

      const wasStockCommitted =
        order.paymentMethod === PaymentMethod.COD &&
        order.status === OrderStatus.CONFIRMED;

      for (const item of order.items) {
        if (wasStockCommitted) {
          await this.productVariantService.restock(
            manager,
            item.variantId,
            item.quantity,
          );
        } else {
          await this.productVariantService.releaseReservedStock(
            manager,
            item.variantId,
            item.quantity,
          );
        }
      }

      await this.syncPaymentStatusOnCancel(manager, order.id);

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancelReason = reason ?? 'Cancelled by seller';

      const saved = await manager.save(Order, order);
      return this.toOrderResponse(saved);
    });
  }

  async cancelOrderByCustomer(
    orderId: string,
    userId: string,
    reason?: string,
  ): Promise<OrderResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager
        .createQueryBuilder(Order, 'order')
        .where('order.id = :id', { id: orderId })
        .setLock('pessimistic_write')
        .getOne();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.userId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to cancel this order',
        );
      }

      if (order.status !== OrderStatus.PENDING_CONFIRMATION) {
        throw new BadRequestException(
          `Order can only be cancelled while pending confirmation ` +
            `(current status: ${order.status})`,
        );
      }

      order.items = await manager.find(OrderItem, { where: { orderId } });
      for (const item of order.items) {
        await this.productVariantService.releaseReservedStock(
          manager,
          item.variantId,
          item.quantity,
        );
      }

      await this.syncPaymentStatusOnCancel(manager, order.id);

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancelReason = reason ?? 'Cancelled by customer';

      const saved = await manager.save(Order, order);
      return this.toOrderResponse(saved);
    });
  }

  // FR-31: Customer xem danh sách đơn của mình (theo dõi trạng thái)
  async findMyOrders(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: { items: true, payment: true },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => this.toOrderResponse(order));
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

  private async syncPaymentStatusOnCancel(
    manager: EntityManager,
    orderId: string,
  ): Promise<void> {
    const payment = await manager
      .createQueryBuilder(Payment, 'payment')
      .where('payment.orderId = :orderId', { orderId })
      .setLock('pessimistic_write')
      .getOne();

    if (!payment) return;

    if (payment.status === PaymentStatus.PENDING) {
      payment.status = PaymentStatus.FAILED;
      await manager.save(Payment, payment);
    }
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

  private async lockOrderForSeller(
    manager: EntityManager,
    orderId: string,
    sellerUserId: string,
  ): Promise<Order> {
    const order = await manager
      .createQueryBuilder(Order, 'order')
      .where('order.id = :id', { id: orderId })
      .setLock('pessimistic_write')
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.items = await manager.find(OrderItem, { where: { orderId } });

    const shop = await manager.findOne(Shop, { where: { id: order.shopId } });

    if (!shop || shop.userId !== sellerUserId) {
      throw new ForbiddenException('You are not allowed to update this order');
    }

    return order;
  }

  private assertTransition(
    current: OrderStatus,
    next: OrderStatus,
    allowedFrom: OrderStatus[],
  ): void {
    if (!allowedFrom.includes(current)) {
      throw new BadRequestException(
        `Cannot change order status from ${current} to ${next}`,
      );
    }
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
      voucherCode: order.voucherCode,
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

  async adminFindAll(query: AdminOrderQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      shopId,
      userId,
      fromDate,
      toDate,
      orderCode,
    } = query;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.shop', 'shop')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (status) qb.andWhere('order.status = :status', { status });
    if (shopId) qb.andWhere('order.shopId = :shopId', { shopId });
    if (userId) qb.andWhere('order.userId = :userId', { userId });
    if (orderCode)
      qb.andWhere('order.orderCode ILIKE :orderCode', {
        orderCode: `%${orderCode}%`,
      });
    if (fromDate) qb.andWhere('order.createdAt >= :fromDate', { fromDate });
    if (toDate) qb.andWhere('order.createdAt <= :toDate', { toDate });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
