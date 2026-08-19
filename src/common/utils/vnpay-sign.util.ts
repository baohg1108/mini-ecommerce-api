import * as crypto from 'crypto';

// VNPay yêu cầu format yyyyMMddHHmmss theo giờ Việt Nam (UTC+7),
// tính thủ công để không phụ thuộc timezone của server
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

// Sort tham số theo alphabet, build query string, ký HMAC-SHA512 theo đúng
// spec VNPay: encodeURIComponent rồi thay %20 -> '+' (chuẩn application/x-www-form-urlencoded)
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
