import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { StatisticsQueryDto } from './dto/statistics-query.dto';

@Injectable()
export class StatisticsService {
  constructor(@InjectRepository(Order) private orderRepo: Repository<Order>) {}

  private applyDateRange(
    qb: SelectQueryBuilder<Order>,
    fromDate?: string,
    toDate?: string,
  ): SelectQueryBuilder<Order> {
    if (fromDate) qb.andWhere('order.createdAt >= :fromDate', { fromDate });
    if (toDate) qb.andWhere('order.createdAt <= :toDate', { toDate });
    return qb;
  }

  async getRevenueAndOrderStats(query: StatisticsQueryDto) {
    const { fromDate, toDate } = query;

    // Doanh thu: chỉ tính đơn đã hoàn thành (completed)
    const revenueQb = this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'totalRevenue')
      .addSelect('COUNT(order.id)', 'completedOrderCount')
      .where('order.status = :status', { status: OrderStatus.COMPLETED });
    this.applyDateRange(revenueQb, fromDate, toDate);
    const revenueRaw = await revenueQb.getRawOne<{
      totalRevenue: string;
      completedOrderCount: string;
    }>();

    // Đơn hàng: tổng số đơn theo từng trạng thái
    const statusQb = this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count');
    this.applyDateRange(statusQb, fromDate, toDate);
    const statusBreakdown = await statusQb
      .groupBy('order.status')
      .getRawMany<{ status: string; count: string }>();

    // Tổng số đơn (mọi trạng thái) trong khoảng thời gian
    const totalOrders = statusBreakdown.reduce(
      (sum, s) => sum + parseInt(s.count, 10),
      0,
    );

    // Nếu không có dữ liệu trong khoảng thời gian -> trả về rỗng (Luồng phụ UC-13)
    if (totalOrders === 0) {
      return {
        totalRevenue: 0,
        completedOrderCount: 0,
        totalOrders: 0,
        statusBreakdown: [],
        message: 'No data available for the specified date range.',
      };
    }

    return {
      totalRevenue: parseFloat(revenueRaw?.totalRevenue ?? '0') || 0,
      completedOrderCount:
        parseInt(revenueRaw?.completedOrderCount ?? '0', 10) || 0,
      totalOrders,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: parseInt(s.count, 10),
      })),
    };
  }

  async getTopShops(query: StatisticsQueryDto, limitCount = 10) {
    const { fromDate, toDate } = query;
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.shop', 'shop')
      .select('shop.id', 'shopId')
      .addSelect('shop.shopName', 'shopName')
      .addSelect('SUM(order.totalAmount)', 'revenue')
      .addSelect('COUNT(order.id)', 'orderCount')
      .where('order.status = :status', { status: OrderStatus.COMPLETED });
    this.applyDateRange(qb, fromDate, toDate);

    const raw = await qb
      .groupBy('shop.id')
      .addGroupBy('shop.shopName')
      .orderBy('revenue', 'DESC')
      .limit(limitCount)
      .getRawMany<{
        shopId: string;
        shopName: string;
        revenue: string;
        orderCount: string;
      }>();

    return raw.map((r) => ({
      shopId: r.shopId,
      shopName: r.shopName,
      revenue: parseFloat(r.revenue) || 0,
      orderCount: parseInt(r.orderCount, 10),
    }));
  }

  async getTopProducts(query: StatisticsQueryDto, limitCount = 10) {
    const { fromDate, toDate } = query;
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .innerJoin('item.variant', 'variant')
      .innerJoin('variant.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(item.quantity)', 'soldQuantity')
      .addSelect('SUM(item.lineTotal)', 'revenue')
      .where('order.status = :status', { status: OrderStatus.COMPLETED });
    this.applyDateRange(qb, fromDate, toDate);

    const raw = await qb
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('revenue', 'DESC')
      .limit(limitCount)
      .getRawMany<{
        productId: string;
        productName: string;
        soldQuantity: string;
        revenue: string;
      }>();

    return raw.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      soldQuantity: parseInt(r.soldQuantity, 10),
      revenue: parseFloat(r.revenue) || 0,
    }));
  }
}
