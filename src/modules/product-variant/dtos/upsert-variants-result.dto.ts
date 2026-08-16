import { ProductVariant } from '../entities/product-variant.entity';

export class VariantErrorDto {
  index!: number;
  sku!: string;
  reason!: string;
}

export class UpsertVariantsResultDto {
  succeeded: ProductVariant[];
  failed: VariantErrorDto[];

  constructor(succeeded: ProductVariant[], failed: VariantErrorDto[]) {
    this.succeeded = succeeded;
    this.failed = failed;
  }
}
