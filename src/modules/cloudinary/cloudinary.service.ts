import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class CloudinaryService {
  private validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không có file nào được upload');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Định dạng file không hợp lệ. Chỉ chấp nhận: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File vượt quá dung lượng cho phép (5MB)');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'mini-ecommerce',
  ): Promise<UploadApiResponse> {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) return reject(new BadRequestException(error.message));
          resolve(result as UploadApiResponse);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder = 'mini-ecommerce',
  ): Promise<UploadApiResponse[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  getTransformedUrl(publicId: string, width: number, height: number): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
    });
  }
}
