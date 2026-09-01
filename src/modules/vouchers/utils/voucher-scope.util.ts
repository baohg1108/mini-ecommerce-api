import { HttpStatus } from '@nestjs/common';
import { Voucher } from '../entities/voucher.entity';
import { VoucherScope } from '../../../common/enums/voucher-scope.enum';
import { AppException } from '../../../common/exceptions/app.exception';
import { VoucherErrorCode } from '../constants/voucher-error-code.constant';

export function isVoucherScopeApplicable(
  voucher: Pick<Voucher, 'scope' | 'shopId'>,
  orderShopId?: string | null,
): boolean {
  if (voucher.scope === VoucherScope.SYSTEM) {
    return true;
  }

  return voucher.shopId === (orderShopId ?? null);
}

export function assertVoucherScopeApplicable(
  voucher: Pick<Voucher, 'scope' | 'shopId'>,
  orderShopId?: string | null,
): void {
  if (!isVoucherScopeApplicable(voucher, orderShopId)) {
    throw new AppException(
      VoucherErrorCode.SHOP_MISMATCH,
      'Voucher does not belong to this shop',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function assertNoVoucherScopeConflict(
  vouchers: Array<Pick<Voucher, 'id' | 'scope' | 'shopId'>>,
): void {
  const systemVouchers = vouchers.filter(
    (v) => v.scope === VoucherScope.SYSTEM,
  );
  const shopVouchers = vouchers.filter((v) => v.scope === VoucherScope.SHOP);

  if (systemVouchers.length > 1) {
    throw new AppException(
      VoucherErrorCode.SCOPE_CONFLICT,
      'Only one system-level voucher can be applied per order',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (shopVouchers.length > 1) {
    throw new AppException(
      VoucherErrorCode.SCOPE_CONFLICT,
      'Only one shop-level voucher can be applied per order',
      HttpStatus.BAD_REQUEST,
    );
  }
}
