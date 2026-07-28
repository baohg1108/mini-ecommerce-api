import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

const MAX_IMAGES_PER_PRODUCT = 5;

@Controller('products')
export class ProductImageController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file, 'avatars');
    return { url: result.secure_url, publicId: result.public_id };
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', MAX_IMAGES_PER_PRODUCT))
  async uploadProductImages(
    @Param('id') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const results = await this.cloudinaryService.uploadMultiple(
      files,
      `mini-ecommerce/products/${productId}`,
    );

    return {
      images: results.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
        thumbnailUrl: this.cloudinaryService.getTransformedUrl(
          r.public_id,
          300,
          300,
        ),
      })),
    };
  }
}
