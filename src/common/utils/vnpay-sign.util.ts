import * as crypto from 'crypto';

export function formatVnpDate(date: Date): string {
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    vnDate.getUTCFullYear().toString() +
    pad(vnDate.getUTCMonth() + 1) +
    pad(vnDate.getUTCDate()) +
    pad(vnDate.getUTCHours()) +
    pad(vnDate.getUTCMinutes()) +
    pad(vnDate.getUTCSeconds())
  );
}

function sortObject(
  params: Record<string, string | number>,
): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(params).sort();
  for (const key of keys) {
    sorted[key] = String(params[key]);
  }
  return sorted;
}

export function buildSignedQuery(
  params: Record<string, string | number>,
  hashSecret: string,
): { queryString: string; secureHash: string } {
  const sorted = sortObject(params);

  const signData = Object.entries(sorted)
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value).replace(/%20/g, '+')}`,
    )
    .join('&');

  const secureHash = crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return {
    queryString: `${signData}&vnp_SecureHash=${secureHash}`,
    secureHash,
  };
}

export function verifySignedQuery(
  query: Record<string, string | undefined>,
  hashSecret: string,
): boolean {
  const receivedHash = query.vnp_SecureHash;

  if (!receivedHash || typeof receivedHash !== 'string') {
    return false;
  }

  const params = { ...query };

  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const filteredParams: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    filteredParams[key] = value;
  }

  const sorted = sortObject(filteredParams);

  const signData = Object.entries(sorted)
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value).replace(/%20/g, '+')}`,
    )
    .join('&');

  const computedHash = crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  const computedBuf = Buffer.from(computedHash, 'utf-8');
  const receivedBuf = Buffer.from(receivedHash, 'utf-8');

  if (computedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuf, receivedBuf);
}

// ---------------------------------------------------------------------------
// FR-46 - VNPay Refund API signing helpers
// The Refund API uses a "|"-joined signature format, different from the
// query-string format used for the payment URL / IPN above.
// Docs: https://sandbox.vnpayment.vn/apis/docs/refund-api/refund.html
// ---------------------------------------------------------------------------

export interface VnpayRefundSignParams {
  requestId: string;
  version: string;
  command: string;
  tmnCode: string;
  transactionType: string;
  txnRef: string;
  amount: number;
  transactionNo: string;
  transactionDate: string;
  createBy: string;
  createDate: string;
  ipAddr: string;
  orderInfo: string;
}

export function buildRefundSignature(
  params: VnpayRefundSignParams,
  hashSecret: string,
): string {
  const signData = [
    params.requestId,
    params.version,
    params.command,
    params.tmnCode,
    params.transactionType,
    params.txnRef,
    params.amount,
    params.transactionNo,
    params.transactionDate,
    params.createBy,
    params.createDate,
    params.ipAddr,
    params.orderInfo,
  ].join('|');

  return crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
}

export interface VnpayRefundResponseSignParams {
  responseId: string;
  command: string;
  responseCode: string;
  message: string;
  tmnCode: string;
  txnRef: string;
  amount: number | string;
  bankCode: string;
  payDate: string;
  transactionNo: string;
  transactionType: string;
  transactionStatus: string;
  orderInfo: string;
}

export function verifyRefundResponseSignature(
  params: VnpayRefundResponseSignParams,
  receivedHash: string,
  hashSecret: string,
): boolean {
  if (!receivedHash) return false;

  const signData = [
    params.responseId,
    params.command,
    params.responseCode,
    params.message,
    params.tmnCode,
    params.txnRef,
    params.amount,
    params.bankCode,
    params.payDate,
    params.transactionNo,
    params.transactionType,
    params.transactionStatus,
    params.orderInfo,
  ].join('|');

  const computedHash = crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  const computedBuf = Buffer.from(computedHash, 'utf-8');
  const receivedBuf = Buffer.from(receivedHash, 'utf-8');

  if (computedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(computedBuf, receivedBuf);
}
