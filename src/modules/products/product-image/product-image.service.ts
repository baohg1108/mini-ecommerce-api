import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage } from '../entities/product-image.entity';
import { Product } from '../entities/product.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

const MAX_IMAGES_PER_PRODUCT = 5;

@Injectable()
export class ProductImageService {
  constructor(
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadImages(
    sellerId: string,
    productId: string,
    files: Express.Multer.File[],
  ): Promise<ProductImage[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files were provided');
    }

    const product = await this.findOwnedBySeller(sellerId, productId);

    const existingCount = await this.imageRepo.count({
      where: { productId: product.id },
    });

    if (existingCount + files.length > MAX_IMAGES_PER_PRODUCT) {
      throw new BadRequestException(
        `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images (currently has ${existingCount})`,
      );
    }

    const uploadResults = await this.cloudinaryService.uploadMultiple(
      files,
      `mini-ecommerce/products/${product.id}`,
    );

    const shouldAssignPrimary = existingCount === 0;

    const images = uploadResults.map((result, index) =>
      this.imageRepo.create({
        productId: product.id,
        imageUrl: result.secure_url,
        displayOrder: existingCount + index,
        isPrimary: shouldAssignPrimary && index === 0,
      }),
    );

    return this.imageRepo.save(images);
  }

  async attachImages(
    sellerId: string,
    productId: string,
    items: { url: string; publicId: string }[],
  ): Promise<ProductImage[]> {
    if (!items || items.length === 0) {
      throw new BadRequestException('No images were provided');
    }

    const product = await this.findOwnedBySeller(sellerId, productId);

    const existingCount = await this.imageRepo.count({
      where: { productId: product.id },
    });

    if (existingCount + items.length > MAX_IMAGES_PER_PRODUCT) {
      throw new BadRequestException(
        `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images (currently has ${existingCount})`,
      );
    }

    const shouldAssignPrimary = existingCount === 0;

    const images = items.map((item, index) =>
      this.imageRepo.create({
        productId: product.id,
        imageUrl: item.url,
        displayOrder: existingCount + index,
        isPrimary: shouldAssignPrimary && index === 0,
      }),
    );

    return this.imageRepo.save(images);
  }

  async findByProduct(productId: string): Promise<ProductImage[]> {
    return this.imageRepo.find({
      where: { productId },
      order: { displayOrder: 'ASC' },
    });
  }

  async setPrimary(
    sellerId: string,
    productId: string,
    imageId: string,
  ): Promise<ProductImage> {
    const product = await this.findOwnedBySeller(sellerId, productId);
    const image = await this.findOwnedImage(product.id, imageId);

    if (image.isPrimary) {
      return image;
    }

    await this.imageRepo.update(
      { productId: product.id, isPrimary: true },
      { isPrimary: false },
    );

    image.isPrimary = true;
    return this.imageRepo.save(image);
  }

  async reorder(
    sellerId: string,
    productId: string,
    orderedImageIds: string[],
  ): Promise<ProductImage[]> {
    const product = await this.findOwnedBySeller(sellerId, productId);
    const images = await this.findByProduct(product.id);

    if (orderedImageIds.length !== images.length) {
      throw new BadRequestException(
        'The list of image ids must match all images belonging to the product',
      );
    }

    const imageById = new Map(images.map((img) => [img.id, img]));

    const updated = orderedImageIds.map((imageId, index) => {
      const image = imageById.get(imageId);
      if (!image) {
        throw new BadRequestException(
          `Image ${imageId} does not belong to this product`,
        );
      }
      image.displayOrder = index;
      return image;
    });

    return this.imageRepo.save(updated);
  }

  async remove(
    sellerId: string,
    productId: string,
    imageId: string,
  ): Promise<void> {
    const product = await this.findOwnedBySeller(sellerId, productId);
    const image = await this.findOwnedImage(product.id, imageId);

    await this.imageRepo.remove(image);

    if (image.isPrimary) {
      const next = await this.imageRepo.findOne({
        where: { productId: product.id },
        order: { displayOrder: 'ASC' },
      });
      if (next) {
        next.isPrimary = true;
        await this.imageRepo.save(next);
      }
    }
  }

  private async findOwnedBySeller(
    sellerId: string,
    productId: string,
  ): Promise<Product> {
    const shop = await this.shopRepo.findOne({ where: { userId: sellerId } });
    if (!shop) throw new NotFoundException("You don't have a shop yet");

    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('No products found');
    if (product.shopId !== shop.id) {
      throw new ForbiddenException('Product does not belong to your shop');
    }
    return product;
  }

  private async findOwnedImage(
    productId: string,
    imageId: string,
  ): Promise<ProductImage> {
    const image = await this.imageRepo.findOne({ where: { id: imageId } });
    if (!image) throw new NotFoundException('No image found');
    if (image.productId !== productId) {
      throw new ForbiddenException('Image does not belong to this product');
    }
    return image;
  }
}
