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
  ) {}

  // ==========================================================================
  // UC-08: Checkout — BR-02 (tách đơn theo shop), BE-040 (pessimistic locking)
  // ==========================================================================

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

    // BE-040: sort theo variantId trước khi lock, tránh deadlock khi nhiều
    // checkout cùng lúc lock chéo nhau theo thứ tự khác nhau
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

  // ==========================================================================
  // BE-051 (FR-30): Seller cập nhật trạng thái đơn — State Machine (BE-053)
  // ==========================================================================

  // FR-30: Seller xác nhận đơn (COD hoặc online đã thanh toán)
  // - COD: trừ tồn kho thật (commitStock) ngay tại bước này
  // - Online: KHÔNG trừ lại, vì đã được trừ khi IPN báo thanh toán thành công
  //   (xem PaymentService.markSuccess)
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

  // FR-30: Seller chuyển sang "đang chuẩn bị hàng"
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

  // FR-30: Seller chuyển sang "đang giao"
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

  // FR-30: Seller xác nhận "đã giao"
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

  // FR-30: đánh dấu "hoàn thành"
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

  // FR-30 / BR-08: Seller huỷ đơn (thường do hết hàng thực tế trước khi giao)
  // BE-057: đồng bộ luôn Payment.status nếu đang PENDING
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

      // Nếu đơn COD đã qua confirmOrder (status = CONFIRMED), tồn kho đã bị
      // trừ thật (stockQty) -> phải cộng trả lại (restock).
      // Ngược lại (chưa confirm), tồn kho vẫn ở dạng reserve -> chỉ release.
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

  // ==========================================================================
  // BE-055 (FR-31): Customer theo dõi & huỷ đơn — BR-04
  // ==========================================================================

  // FR-31 / BR-04: Customer tự huỷ đơn — chỉ được khi đơn đang "Chờ xác nhận"
  // (đơn COD chưa được Seller xác nhận). Sau khi Seller đã xác nhận hoặc
  // đơn online đã thanh toán, việc huỷ phải qua yêu cầu hỗ trợ/khiếu nại.
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

      // Tại PENDING_CONFIRMATION, tồn kho luôn ở dạng reserve (chưa commit)
      // với cả COD lẫn online -> chỉ cần release
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

  // FR-31: Customer xem chi tiết 1 đơn (theo dõi trạng thái)
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

  // ==========================================================================
  // BE-057: Đồng bộ Payment.status khi Order bị huỷ
  // ==========================================================================

  // Khi order bị huỷ (bởi customer hoặc seller), Payment liên quan phải được
  // đồng bộ để tránh treo ở PENDING mãi mãi. Chỉ đồng bộ nếu Payment còn
  // PENDING; nếu đã SUCCESS thì việc huỷ sau khi đã thanh toán cần xử lý
  // hoàn tiền riêng (FR-46), không tự đổi status ở đây để tránh nhầm lẫn
  // với luồng refund chính thức.
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

  // ==========================================================================
  // Seller: danh sách đơn theo shop
  // ==========================================================================

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

  // ==========================================================================
  // Helpers
  // ==========================================================================

  // lock order + xác thực order thuộc đúng shop của seller đang gọi
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

  // BE-053: validate chuyển trạng thái hợp lệ, chặn nhảy cóc/đi lùi
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
