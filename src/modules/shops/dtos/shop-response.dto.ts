import { Exclude, Expose } from 'class-transformer';
import { ShopStatus } from '../../../common/enums/shop-status.enum';

@Exclude()
export class ShopResponseDto {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  shopName!: string;

  @Expose()
  slug!: string;

  @Expose()
  description!: string | null;

  @Expose()
  logoUrl!: string | null;

  @Expose()
  businessLicenseUrl!: string | null;

  @Expose()
  returnPolicy!: string | null;

  @Expose()
  shippingPolicy!: string | null;

  @Expose()
  status!: ShopStatus;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
