import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DELETE_CHUNK_SIZE = 100;

interface DeleteResourcesResponse {
  deleted: Record<string, string>;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  private validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file was uploaded');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file format. Only accepted: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds the allowed size (5MB)');
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

  async deleteFiles(publicIds: string[]): Promise<void> {
    const ids = publicIds.filter(Boolean);
    if (!ids.length) return;

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
      chunks.push(ids.slice(i, i + DELETE_CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      try {
        const result = (await cloudinary.api.delete_resources(
          chunk,
        )) as DeleteResourcesResponse;

        const failed = Object.entries(result.deleted ?? {}).filter(
          ([, status]) => status !== 'deleted',
        );
        if (failed.length) {
          this.logger.warn(
            `Cloudinary failed to delete some images: ${JSON.stringify(failed)}`,
          );
        }
      } catch (error) {
        this.logger.error('Error calling Cloudinary delete_resources', error);
      }
    }
  }

  extractPublicId(imageUrl: string): string | null {
    try {
      const url = new URL(imageUrl);
      const parts = url.pathname.split('/upload/');
      if (parts.length < 2) return null;

      let path = parts[1];
      path = path.replace(/^v\d+\//, '');
      path = path.replace(/\.[a-zA-Z0-9]+$/, '');

      return decodeURIComponent(path);
    } catch (error) {
      this.logger.warn(
        `Could not parse publicId from URL: ${imageUrl} - ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
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
