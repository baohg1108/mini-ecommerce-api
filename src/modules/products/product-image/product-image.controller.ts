import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { ProductImageService } from './product-image.service';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/role.guard';
import { Roles } from '../../../common/decorators/role.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

const MAX_IMAGES_PER_PRODUCT = 5;

@Controller('products')
export class ProductImageController {
  constructor(
    private readonly productImageService: ProductImageService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(AccessTokenGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file, 'avatars');

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  @Roles(UserRole.SELLER)
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', MAX_IMAGES_PER_PRODUCT))
  async uploadProductImages(
    @CurrentUserId() sellerId: string,
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const images = await this.productImageService.uploadImages(
      sellerId,
      productId,
      files,
    );

    return {
      images,
    };
  }
}
