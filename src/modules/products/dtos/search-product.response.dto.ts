export class SearchProductResponseDto {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(items: any[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}
