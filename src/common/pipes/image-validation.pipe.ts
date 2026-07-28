import { ParseFilePipeBuilder, HttpStatus } from '@nestjs/common';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = /(jpg|jpeg|png|webp)$/;

export function buildImageValidationPipe() {
  return new ParseFilePipeBuilder()
    .addFileTypeValidator({ fileType: ALLOWED_IMAGE_TYPES })
    .addMaxSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES })
    .build({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      fileIsRequired: true,
    });
}

export function buildImagesValidationPipe() {
  return new ParseFilePipeBuilder()
    .addFileTypeValidator({ fileType: ALLOWED_IMAGE_TYPES })
    .addMaxSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES })
    .build({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      fileIsRequired: true,
    });
}

export const MEDIA_LIMITS = {
  MAX_IMAGE_SIZE_BYTES,
  MAX_PRODUCT_IMAGES: 5,
  MAX_SHOP_IMAGES: 3,
};
