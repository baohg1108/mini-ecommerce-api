import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    private dataSource: DataSource,
  ) {}

  async createReview(
    customerId: string,
    orderItem: OrderItem,
    dto: CreateReviewDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      // orderItem.order đã được load ở guard (relations: { order: true })
      const shopId = orderItem.order.shopId;

      // Cần variant -> product để lấy productId
      const orderItemWithVariant = await manager.findOne(OrderItem, {
        where: { id: orderItem.id },
        relations: { variant: true },
      });
      if (!orderItemWithVariant) {
        throw new NotFoundException('Product not found in order');
      }
      const productId = orderItemWithVariant.variant.productId;

      const review = manager.create(Review, {
        orderItemId: dto.orderItemId,
        shopId,
        customerId,
        rating: dto.rating,
        comment: dto.comment,
      });
      const saved = await manager.save(review);

      await this.updateProductAverageRating(manager, productId);
      await this.updateShopAverageRating(manager, shopId);

      return saved;
    });
  }

  async replyReview(reviewId: string, sellerId: string, dto: ReplyReviewDto) {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: { shop: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    // Xác nhận field chủ shop đúng tên trên Shop entity (ownerId? userId?)
    if (review.shop.userId !== sellerId) {
      throw new ForbiddenException(
        'You are not authorized to reply to this review',
      );
    }

    review.sellerReply = dto.reply;
    review.sellerRepliedAt = new Date();
    return this.reviewRepo.save(review);
  }

  async findByProduct(productId: string) {
    return this.reviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.orderItem', 'orderItem')
      .innerJoin('orderItem.variant', 'variant')
      .leftJoin('review.customer', 'customer')
      .addSelect(['customer.id', 'customer.fullName', 'customer.avatarUrl'])
      .where('variant.productId = :productId', { productId })
      .orderBy('review.createdAt', 'DESC')
      .getMany();
  }

  private async updateProductAverageRating(
    manager: EntityManager,
    productId: string,
  ) {
    const raw = await manager
      .createQueryBuilder(Review, 'r')
      .innerJoin('r.orderItem', 'oi')
      .innerJoin('oi.variant', 'v')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('v.productId = :productId', { productId })
      .getRawOne<{ avg: string; count: string }>();

    await manager.update(Product, productId, {
      avgRating: parseFloat(raw?.avg ?? '0') || 0,
      reviewCount: parseInt(raw?.count ?? '0', 10) || 0,
    });
  }

  private async updateShopAverageRating(
    manager: EntityManager,
    shopId: string,
  ) {
    const raw = await manager
      .createQueryBuilder(Review, 'r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.shopId = :shopId', { shopId })
      .getRawOne<{ avg: string; count: string }>();

    await manager.update(Shop, shopId, {
      avgRating: parseFloat(raw?.avg ?? '0') || 0,
      reviewCount: parseInt(raw?.count ?? '0', 10) || 0,
    });
  }
}
