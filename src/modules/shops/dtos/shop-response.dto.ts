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
  rejectionReason!: string | null;

  @Expose()
  approvedAt!: Date | null;

  @Expose()
  approvedBy!: string | null;

  @Expose()
  rejectedAt!: Date | null;

  @Expose()
  rejectedBy!: string | null;

  @Expose()
  suspendedReason!: string | null;

  @Expose()
  suspendedAt!: Date | null;

  @Expose()
  suspendedBy!: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
