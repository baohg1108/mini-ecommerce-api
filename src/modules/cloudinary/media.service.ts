import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { UploadImageDto } from '../../common/dtos/upload-image.dto';

export enum MediaFolder {
  AVATAR = 'mini-ecommerce/avatars',
  PRODUCT = 'mini-ecommerce/products',
  SHOP = 'mini-ecommerce/shops',
  CATEGORY = 'mini-ecommerce/categories',
}

@Injectable()
export class MediaService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  private toDto(result: {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  }): UploadImageDto {
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }

  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadImageDto> {
    const result = await this.cloudinaryService.uploadFile(
      file,
      `${MediaFolder.AVATAR}/${userId}`,
    );
    return this.toDto(result);
  }

  async uploadProductImages(
    files: Express.Multer.File[],
    productId: string,
  ): Promise<UploadImageDto[]> {
    const results = await this.cloudinaryService.uploadMultiple(
      files,
      `${MediaFolder.PRODUCT}/${productId}`,
    );
    return results.map((r) => this.toDto(r));
  }

  async uploadShopImages(
    files: Express.Multer.File[],
    shopId: string,
  ): Promise<UploadImageDto[]> {
    const results = await this.cloudinaryService.uploadMultiple(
      files,
      `${MediaFolder.SHOP}/${shopId}`,
    );
    return results.map((r) => this.toDto(r));
  }

  async uploadCategoryImage(
    file: Express.Multer.File,
    categoryId: string,
  ): Promise<UploadImageDto> {
    const result = await this.cloudinaryService.uploadFile(
      file,
      `${MediaFolder.CATEGORY}/${categoryId}`,
    );
    return this.toDto(result);
  }

  async deleteImage(publicId: string): Promise<void> {
    await this.cloudinaryService.deleteFile(publicId);
  }

  async deleteImages(publicIds: string[]): Promise<void> {
    await Promise.all(
      publicIds.map((id) => this.cloudinaryService.deleteFile(id)),
    );
  }

  getThumbnailUrl(publicId: string, size = 300): string {
    return this.cloudinaryService.getTransformedUrl(publicId, size, size);
  }
}
