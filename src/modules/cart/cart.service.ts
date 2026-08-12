import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { CartResponseDto } from './dtos/cart.response.dto';
import { CartItemResponseDto } from './dtos/cart-item.response.dto';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ShopStatus } from '../../common/enums/shop-status.enum';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
  ) {}

  // UC-07: add to cart
  async addToCart(userId: string, dto: AddToCartDto): Promise<CartResponseDto> {
    const { variantId, quantity } = dto;

    if (!quantity || quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      // Lock ProductVariant
      const variant = await manager
        .createQueryBuilder(ProductVariant, 'variant')
        .where('variant.id = :variantId', { variantId })
        .setLock('pessimistic_write')
        .getOne();

      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }

      // get Product + Shop after has lock variant
      // const variantWithRelations = await manager
      //   .getRepository(ProductVariant)
      //   .findOne({
      //     where: { id: variantId },
      //     relations: {
      //       product: {
      //         shop: true,
      //       },
      //     },
      //   });

      // get Product + Shop after has lock variant
      const variantWithRelations = await manager.findOne(ProductVariant, {
        where: { id: variantId },
        relations: {
          product: {
            shop: true,
          },
        },
      });

      if (!variantWithRelations) {
        throw new NotFoundException('Product variant not found');
      }

      const product = variantWithRelations.product;

      if (!product || product.status !== ProductStatus.ACTIVE) {
        throw new NotFoundException('Product not available');
      }

      const shop = product.shop;

      if (!shop || shop.status !== ShopStatus.ACTIVE) {
        throw new NotFoundException('Shop not active');
      }

      // Get / create Cart
      let cart = await manager.findOne(Cart, {
        where: { userId },
      });

      if (!cart) {
        cart = manager.create(Cart, { userId });
        cart = await manager.save(cart);
      }

      // get existing CartItem
      let cartItem = await manager.findOne(CartItem, {
        where: {
          cartId: cart.id,
          variantId,
        },
      });

      const currentQty = cartItem ? cartItem.quantity : 0;
      const newQty = currentQty + quantity;

      // check stock
      if (newQty > variant.availableQty) {
        const remaining = Math.max(variant.availableQty - currentQty, 0);

        throw new BadRequestException(
          `Insufficient stock. Only ${remaining} items available.`,
        );
      }

      // update / create CartItem
      if (cartItem) {
        cartItem.quantity = newQty;
        cartItem = await manager.save(CartItem, cartItem);
      } else {
        cartItem = manager.create(CartItem, {
          cartId: cart.id,
          variantId,
          quantity,
        });

        cartItem = await manager.save(CartItem, cartItem);
      }

      //get update cart
      const items = await manager.find(CartItem, {
        where: { cartId: cart.id },
        relations: {
          variant: {
            product: {},
          },
        },
      });

      return this.toCartResponse(cart, items);
    });
  }

  async getMyCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.cartItemRepository.find({
      where: { cartId: cart.id },
      relations: { variant: { product: {} } },
    });
    return this.toCartResponse(cart, items);
  }

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({ where: { userId } });
    if (!cart) {
      cart = this.cartRepository.create({ userId });
      cart = await this.cartRepository.save(cart);
    }
    return cart;
  }

  private toCartResponse(cart: Cart, items: CartItem[]): CartResponseDto {
    return new CartResponseDto({
      id: cart.id,
      userId: cart.userId,
      items: items.map(
        (item) =>
          new CartItemResponseDto({
            id: item.id,
            variantId: item.variantId,
            quantity: item.quantity,
            productId: item.variant?.product?.id,
            productName: item.variant?.product?.name,
            price: item.variant?.price,
            stockQty: item.variant?.availableQty,
          }),
      ),
    });
  }
}
