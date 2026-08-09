import { randomBytes } from 'node:crypto';

export function slugify(input: string): string {
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

  return normalized
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// if the slug already exists, we will add a random suffix to make it unique
export function randomSuffix(length = 6): string {
  return randomBytes(length).toString('hex').slice(0, length);
}
