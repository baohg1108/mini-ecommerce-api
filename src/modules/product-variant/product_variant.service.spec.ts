import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductVariantService } from './product-variant.service';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { CreateProductVariantDto } from './dtos/create-product-variant.dto';
import { UpdateProductVariantDto } from './dtos/update-product-variant.dto';
import { UpsertVariantsDto } from './dtos/upsert-variant.dto';

/**
 * Test matrix: xem "ProductVariant_Test_Matrix.xlsx"
 * File này chỉ phủ các test case UNIT được tô XANH LÁ trong ma trận
 * (PV-UNIT-027 -> PV-UNIT-058), tương ứng với ProductVariantService
 * (create/Upsert/findById/findBySku/findByProduct/update) và entity ProductVariant.
 *
 * Các test case PV-UNIT-001 -> PV-UNIT-026 (validate() của DTO bằng class-validator)
 * không nằm trong file này vì chúng thuộc các spec riêng của từng DTO.
 */

// ---------------------------------------------------------------------
// Test doubles — kiểu dữ liệu mô phỏng, KHÔNG dùng `any` để tránh vi phạm
// các rule @typescript-eslint/no-unsafe-*.
// ---------------------------------------------------------------------

interface TestShop {
  userId: string;
  status?: string;
}

interface TestProduct {
  id: string;
  shop: TestShop;
}

interface TestVariant {
  id?: string;
  productId?: string;
  sku: string;
  attributes?: Record<string, string | number>;
  price: number;
  stockQty: number;
  reservedQty?: number;
  imageUrl?: string | null;
  status?: string;
  product?: TestProduct;
}

interface QueryBuilderMock {
  where: jest.Mock<QueryBuilderMock, [string, Record<string, unknown>?]>;
  getMany: jest.Mock<Promise<TestVariant[]>, []>;
}

interface VariantRepoMock {
  findOne: jest.Mock<Promise<TestVariant | null>, [unknown?]>;
  find: jest.Mock<Promise<TestVariant[]>, [unknown?]>;
  create: jest.Mock<TestVariant, [TestVariant]>;
  save: jest.Mock<Promise<TestVariant>, [TestVariant]>;
  createQueryBuilder: jest.Mock<QueryBuilderMock, [string]>;
}

interface ProductRepoMock {
  findOne: jest.Mock<Promise<TestProduct | null>, [unknown?]>;
}

const createVariantRepoMock = (): VariantRepoMock => ({
  findOne: jest.fn<Promise<TestVariant | null>, [unknown?]>(),
  find: jest.fn<Promise<TestVariant[]>, [unknown?]>(),
  create: jest.fn<TestVariant, [TestVariant]>(),
  save: jest.fn<Promise<TestVariant>, [TestVariant]>(),
  createQueryBuilder: jest.fn<QueryBuilderMock, [string]>(),
});

const createProductRepoMock = (): ProductRepoMock => ({
  findOne: jest.fn<Promise<TestProduct | null>, [unknown?]>(),
});

const makeQueryBuilder = (result: TestVariant[]): QueryBuilderMock => {
  const getMany = jest
    .fn<Promise<TestVariant[]>, []>()
    .mockResolvedValue(result);
  const where = jest.fn<QueryBuilderMock, [string, Record<string, unknown>?]>();
  const qb: QueryBuilderMock = { where, getMany };
  where.mockReturnValue(qb);
  return qb;
};

describe('ProductVariantService', () => {
  let service: ProductVariantService;
  let variantRepo: VariantRepoMock;
  let productRepo: ProductRepoMock;

  const makeProduct = (overrides: Partial<TestProduct> = {}): TestProduct => ({
    id: 'product-1',
    shop: { userId: 'user-1' },
    ...overrides,
  });

  const makeVariant = (overrides: Partial<TestVariant> = {}): TestVariant => ({
    id: 'variant-1',
    productId: 'product-1',
    sku: 'SKU-A',
    attributes: {},
    price: 100000,
    stockQty: 10,
    reservedQty: 0,
    imageUrl: null,
    status: 'active',
    ...overrides,
  });

  const makeVariantWithProduct = (
    overrides: Partial<TestVariant> = {},
  ): TestVariant => ({
    ...makeVariant(),
    product: { id: 'product-1', shop: { userId: 'user-1' } },
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantService,
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: createVariantRepoMock(),
        },
        {
          provide: getRepositoryToken(Product),
          useValue: createProductRepoMock(),
        },
      ],
    }).compile();

    service = module.get<ProductVariantService>(ProductVariantService);
    variantRepo = module.get<VariantRepoMock>(
      getRepositoryToken(ProductVariant),
    );
    productRepo = module.get<ProductRepoMock>(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ------------------------------------------------------------------
  // create() — PV-UNIT-027 .. PV-UNIT-033
  // ------------------------------------------------------------------
  describe('create()', () => {
    it('PV-UNIT-027: tạo variant thành công khi product tồn tại và thuộc shop của user', async () => {
      const product = makeProduct();
      const dto: CreateProductVariantDto = {
        sku: 'SKU-001',
        price: 100000,
        stockQty: 20,
      };
      const created: TestVariant = {
        productId: product.id,
        sku: dto.sku,
        attributes: {},
        price: dto.price,
        stockQty: dto.stockQty,
        imageUrl: null,
      };

      productRepo.findOne.mockResolvedValue(product);
      variantRepo.findOne.mockResolvedValue(null);
      variantRepo.create.mockReturnValue(created);
      variantRepo.save.mockResolvedValue({ id: 'new-id', ...created });

      const result = await service.create(product.id, 'user-1', dto);

      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: { id: product.id },
        relations: { shop: true },
      });
      expect(variantRepo.findOne).toHaveBeenCalledWith({
        where: { sku: dto.sku },
      });
      expect(variantRepo.create).toHaveBeenCalledWith(created);
      expect(variantRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual({ id: 'new-id', ...created });
    });

    it('PV-UNIT-028: ném NotFoundException khi product không tồn tại', async () => {
      productRepo.findOne.mockResolvedValue(null);
      const dto: CreateProductVariantDto = {
        sku: 'SKU-X',
        price: 1,
        stockQty: 1,
      };

      await expect(
        service.create('missing-product', 'user-1', dto),
      ).rejects.toThrow(new NotFoundException('Product not found'));
      expect(variantRepo.findOne).not.toHaveBeenCalled();
    });

    it('PV-UNIT-029: ném NotFoundException khi product không thuộc shop của user (không lộ thông tin)', async () => {
      productRepo.findOne.mockResolvedValue(
        makeProduct({ shop: { userId: 'another-user' } }),
      );
      const dto: CreateProductVariantDto = {
        sku: 'SKU-X',
        price: 1,
        stockQty: 1,
      };

      await expect(service.create('product-1', 'user-1', dto)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    });

    it('PV-UNIT-030: ném ConflictException khi sku đã tồn tại trên hệ thống', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.findOne.mockResolvedValue(makeVariant({ sku: 'SKU-EXIST' }));
      const dto: CreateProductVariantDto = {
        sku: 'SKU-EXIST',
        price: 1000,
        stockQty: 1,
      };

      await expect(service.create('product-1', 'user-1', dto)).rejects.toThrow(
        new ConflictException('SKU already exists'),
      );
    });

    it('PV-UNIT-031 (GAP - BR-08): create() vẫn tạo variant thành công dù shop đang SUSPENDED', async () => {
      // Ghi chú: ProductVariantService.create() không gọi ensureShopIsActive() như Shop module,
      // nên đây là gap cần bổ sung. Test này chốt hành vi HIỆN TẠI để dev nhận biết khi sửa BR-08.
      productRepo.findOne.mockResolvedValue(
        makeProduct({ shop: { userId: 'user-1', status: 'SUSPENDED' } }),
      );
      variantRepo.findOne.mockResolvedValue(null);
      const dto: CreateProductVariantDto = {
        sku: 'SKU-002',
        price: 1000,
        stockQty: 1,
      };
      const created: TestVariant = { productId: 'product-1', ...dto };
      variantRepo.create.mockReturnValue(created);
      variantRepo.save.mockResolvedValue({ id: 'v-1', ...created });

      const result = await service.create('product-1', 'user-1', dto);

      expect(result).toBeDefined();
      expect(variantRepo.save).toHaveBeenCalled();
    });

    it('PV-UNIT-032: gán attributes mặc định {} khi dto không truyền attributes', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.findOne.mockResolvedValue(null);
      const dto: CreateProductVariantDto = {
        sku: 'SKU-003',
        price: 1000,
        stockQty: 1,
      };
      variantRepo.create.mockImplementation((data) => data);
      variantRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.create('product-1', 'user-1', dto);

      expect(variantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ attributes: {} }),
      );
    });

    it('PV-UNIT-033: gán imageUrl=null khi dto không truyền imageUrl', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.findOne.mockResolvedValue(null);
      const dto: CreateProductVariantDto = {
        sku: 'SKU-004',
        price: 1000,
        stockQty: 1,
      };
      variantRepo.create.mockImplementation((data) => data);
      variantRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.create('product-1', 'user-1', dto);

      expect(variantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: null }),
      );
    });
  });

  // ------------------------------------------------------------------
  // Upsert() — PV-UNIT-034 .. PV-UNIT-044
  // ------------------------------------------------------------------
  describe('Upsert()', () => {
    it('PV-UNIT-034: tạo mới thành công tất cả item không có id', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.find.mockResolvedValue([]);
      variantRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([]));
      variantRepo.create.mockImplementation((data) => data);
      let counter = 0;
      variantRepo.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: data.id ?? `v-${++counter}` }),
      );

      const dto: UpsertVariantsDto = {
        variants: [
          { sku: 'A', price: 1, stockQty: 1 },
          { sku: 'B', price: 2, stockQty: 2 },
          { sku: 'C', price: 3, stockQty: 3 },
        ],
      };

      const result = await service.Upsert('product-1', 'user-1', dto);

      expect(result.succeeded).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });

    it('PV-UNIT-035: cập nhật thành công item có id hợp lệ thuộc product', async () => {
      const existing = makeVariant({ id: 'v-1', sku: 'A-OLD' });
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.find.mockResolvedValue([existing]);
      variantRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([])); // sku mới, chưa ai dùng
      variantRepo.save.mockImplementation((data) => Promise.resolve(data));

      const dto: UpsertVariantsDto = {
        variants: [
          {
            id: 'v-1',
            sku: 'A-NEW',
            price: 150000,
            stockQty: 5,
            attributes: { color: 'red' },
            imageUrl: 'http://img',
          },
        ],
      };

      const result = await service.Upsert('product-1', 'user-1', dto);

      expect(result.failed).toHaveLength(0);
      expect(result.succeeded).toHaveLength(1);
      expect(result.succeeded[0]).toMatchObject({
        id: 'v-1',
        sku: 'A-NEW',
        price: 150000,
        stockQty: 5,
        attributes: { color: 'red' },
        imageUrl: 'http://img',
      });
    });

    it('PV-UNIT-036: ném NotFoundException toàn bộ khi product không tồn tại', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.Upsert('missing-product', 'user-1', { variants: [] }),
      ).rejects.toThrow(new NotFoundException('Product not found'));
      expect(variantRepo.find).not.toHaveBeenCalled();
    });

    it('PV-UNIT-037: ném NotFoundException khi product không thuộc shop của user', async () => {
      productRepo.findOne.mockResolvedValue(
        makeProduct({ shop: { userId: 'other' } }),
      );

      await expect(
        service.Upsert('product-1', 'user-1', { variants: [] }),
      ).rejects.toThrow(new NotFoundException('Product not found'));
    });

    it('PV-UNIT-038: cô lập lỗi — 1 item lỗi (id không thuộc product) không ảnh hưởng các item khác', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.find.mockResolvedValue([]); // existingById rỗng => item có id sẽ not-found
      variantRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([]));
      variantRepo.create.mockImplementation((data) => data);
      let counter = 0;
      variantRepo.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: data.id ?? `v-${++counter}` }),
      );

      const dto: UpsertVariantsDto = {
        variants: [
          { sku: 'A', price: 0, stockQty: 0 },
          { id: 'unknown-id', sku: 'B', price: 0, stockQty: 0 },
          { sku: 'C', price: 0, stockQty: 0 },
        ],
      };

      const result = await service.Upsert('product-1', 'user-1', dto);

      expect(result.succeeded).toHaveLength(2);
      expect(result.failed).toEqual([
        {
          index: 1,
          sku: 'B',
          reason: 'Variant not found or does not belong to this product',
        },
      ]);
    });

    it('PV-UNIT-039: đẩy item vào failed[] khi id được truyền nhưng không thuộc product', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.find.mockResolvedValue([]);
      variantRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([]));

      const dto: UpsertVariantsDto = {
        variants: [
          { id: 'id-thuoc-product-khac', sku: 'X', price: 0, stockQty: 0 },
        ],
      };

      const result = await service.Upsert('product-1', 'user-1', dto);

      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toMatchObject({ index: 0, sku: 'X' });
      expect(result.failed[0].reason).toContain('not found');
    });

    it('PV-UNIT-040: phát hiện conflict sku giữa 2 item mới trong cùng batch', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.find.mockResolvedValue([]);
      variantRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([])); // 'DUP' chưa có trong DB
      variantRepo.create.mockImplementation((data) => data);
      variantRepo.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'v-new' }),
      );

      const dto: UpsertVariantsDto = {
        variants: [
          { sku: 'DUP', price: 1, stockQty: 1 },
          { sku: 'DUP', price: 2, stockQty: 2 },
        ],
      };

      const result = await service.Upsert('product-1', 'user-1', dto);

      expect(result.succeeded).toHaveLength(1);
      expect(result.succeeded[0].sku).toBe('DUP');
      expect(result.failed).toEqual([
        { index: 1, sku: 'DUP', reason: 'SKU already exists' },
      ]);
    });

    it('PV-UNIT-041: cho phép update item giữ nguyên sku hiện tại của chính variant đó', async () => {
      const existing = makeVariant({ id: 'v-1', sku: 'SAME-SKU' });
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.find.mockResolvedValue([existing]);
      // Query conflict trả về chính variant đang update (cùng id) => không phải conflict thật
      variantRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([existing]),
      );
      variantRepo.save.mockImplementation((data) => Promise.resolve(data));

      const dto: UpsertVariantsDto = {
        variants: [{ id: 'v-1', sku: 'SAME-SKU', price: 999, stockQty: 9 }],
      };

      const result = await service.Upsert('product-1', 'user-1', dto);

      expect(result.failed).toHaveLength(0);
      expect(result.succeeded).toHaveLength(1);
      expect(result.succeeded[0].price).toBe(999);
    });

    it('PV-UNIT-042: phát hiện conflict khi update item đổi sang sku thuộc variant khác trong DB', async () => {
      const existing = makeVariant({ id: 'v-1', sku: 'MY-SKU' });
      const other = makeVariant({ id: 'v-2', sku: 'OTHER-SKU' });
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.find.mockResolvedValue([existing]);
      variantRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([other]));

      const dto: UpsertVariantsDto = {
        variants: [{ id: 'v-1', sku: 'OTHER-SKU', price: 1, stockQty: 1 }],
      };

      const result = await service.Upsert('product-1', 'user-1', dto);

      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toEqual([
        { index: 0, sku: 'OTHER-SKU', reason: 'SKU already exists' },
      ]);
    });

    it('PV-UNIT-043: trả về UpsertVariantsResultDto đúng khi trộn lẫn nhiều case (tạo mới, cập nhật, lỗi)', async () => {
      const existingToUpdate = makeVariant({ id: 'v-1', sku: 'UPDATE-ME' });
      const otherOwned = makeVariant({ id: 'v-99', sku: 'TAKEN-SKU' });
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.find.mockResolvedValue([existingToUpdate]);
      variantRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([otherOwned]),
      );
      variantRepo.create.mockImplementation((data) => data);
      variantRepo.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: data.id ?? 'new-id' }),
      );

      const dto: UpsertVariantsDto = {
        variants: [
          { sku: 'NEW-OK', price: 1, stockQty: 1 }, // index 0: create OK
          { id: 'v-1', sku: 'UPDATE-ME', price: 2, stockQty: 2 }, // index 1: update OK
          { id: 'unknown', sku: 'GHOST', price: 3, stockQty: 3 }, // index 2: not found
          { sku: 'TAKEN-SKU', price: 4, stockQty: 4 }, // index 3: conflict
        ],
      };

      const result = await service.Upsert('product-1', 'user-1', dto);

      expect(result.succeeded).toHaveLength(2);
      expect(result.failed).toHaveLength(2);
      expect(result.failed).toEqual(
        expect.arrayContaining([
          {
            index: 2,
            sku: 'GHOST',
            reason: 'Variant not found or does not belong to this product',
          },
          { index: 3, sku: 'TAKEN-SKU', reason: 'SKU already exists' },
        ]),
      );
    });

    it('PV-UNIT-044: variants=[] trả về succeeded=[] và failed=[] mà không gọi createQueryBuilder', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      variantRepo.find.mockResolvedValue([]);

      const result = await service.Upsert('product-1', 'user-1', {
        variants: [],
      });

      expect(result.succeeded).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(variantRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // findById() — PV-UNIT-045 .. PV-UNIT-046
  // ------------------------------------------------------------------
  describe('findById()', () => {
    it('PV-UNIT-045: trả về variant khi tồn tại', async () => {
      const variant = makeVariant();
      variantRepo.findOne.mockResolvedValue(variant);

      const result = await service.findById('variant-1');

      expect(variantRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
      });
      expect(result).toEqual(variant);
    });

    it('PV-UNIT-046: ném NotFoundException khi variant không tồn tại', async () => {
      variantRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        new NotFoundException('Variant not found'),
      );
    });
  });

  // ------------------------------------------------------------------
  // findBySku() — PV-UNIT-047 .. PV-UNIT-048
  // ------------------------------------------------------------------
  describe('findBySku()', () => {
    it('PV-UNIT-047: trả về variant khi sku tồn tại', async () => {
      const variant = makeVariant({ sku: 'SKU-X' });
      variantRepo.findOne.mockResolvedValue(variant);

      const result = await service.findBySku('SKU-X');

      expect(variantRepo.findOne).toHaveBeenCalledWith({
        where: { sku: 'SKU-X' },
      });
      expect(result).toEqual(variant);
    });

    it('PV-UNIT-048: ném NotFoundException khi sku không tồn tại', async () => {
      variantRepo.findOne.mockResolvedValue(null);

      await expect(service.findBySku('MISSING-SKU')).rejects.toThrow(
        new NotFoundException('Variant not found'),
      );
    });
  });

  // ------------------------------------------------------------------
  // findByProduct() — PV-UNIT-049 .. PV-UNIT-050
  // ------------------------------------------------------------------
  describe('findByProduct()', () => {
    it('PV-UNIT-049: trả về mảng rỗng khi sản phẩm chưa có variant nào', async () => {
      variantRepo.find.mockResolvedValue([]);

      const result = await service.findByProduct('product-empty');

      expect(result).toEqual([]);
    });

    it('PV-UNIT-050: trả về đúng danh sách variant theo productId', async () => {
      const variants = [
        makeVariant({ id: 'v1' }),
        makeVariant({ id: 'v2' }),
        makeVariant({ id: 'v3' }),
      ];
      variantRepo.find.mockResolvedValue(variants);

      const result = await service.findByProduct('product-1');

      expect(variantRepo.find).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
      });
      expect(result).toHaveLength(3);
    });
  });

  // ------------------------------------------------------------------
  // update() — PV-UNIT-051 .. PV-UNIT-057
  // ------------------------------------------------------------------
  describe('update()', () => {
    it('PV-UNIT-051: cập nhật đúng field cho variant thuộc shop của user', async () => {
      const variant = makeVariantWithProduct({ price: 100000, stockQty: 10 });
      variantRepo.findOne.mockResolvedValue(variant);
      variantRepo.save.mockImplementation((data) => Promise.resolve(data));

      const dto: UpdateProductVariantDto = { price: 120000, stockQty: 15 };
      const result = await service.update('variant-1', 'user-1', dto);

      expect(variantRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
        relations: { product: { shop: true } },
      });
      expect(result.price).toBe(120000);
      expect(result.stockQty).toBe(15);
      expect(variantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ price: 120000, stockQty: 15 }),
      );
    });

    it('PV-UNIT-052: ném NotFoundException khi variant không tồn tại', async () => {
      variantRepo.findOne.mockResolvedValue(null);

      await expect(service.update('missing', 'user-1', {})).rejects.toThrow(
        new NotFoundException('Variant not found'),
      );
    });

    it('PV-UNIT-053: ném NotFoundException khi variant không thuộc shop của user (ẩn thông tin)', async () => {
      const variant = makeVariantWithProduct({
        product: { id: 'product-1', shop: { userId: 'other-user' } },
      });
      variantRepo.findOne.mockResolvedValue(variant);

      await expect(service.update('variant-1', 'user-1', {})).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    });

    it('PV-UNIT-054: ném ConflictException khi đổi sang sku đã tồn tại', async () => {
      const variant = makeVariantWithProduct({ sku: 'OLD-SKU' });
      variantRepo.findOne
        .mockResolvedValueOnce(variant) // load variant theo id
        .mockResolvedValueOnce(makeVariant({ sku: 'NEW-SKU' })); // check trùng sku mới

      const dto: UpdateProductVariantDto = { sku: 'NEW-SKU' };

      await expect(service.update('variant-1', 'user-1', dto)).rejects.toThrow(
        new ConflictException('SKU already exists'),
      );
    });

    it('PV-UNIT-055: không kiểm tra trùng sku khi dto.sku giữ nguyên như hiện tại', async () => {
      const variant = makeVariantWithProduct({ sku: 'SAME-SKU' });
      variantRepo.findOne.mockResolvedValueOnce(variant); // chỉ gọi 1 lần để load variant
      variantRepo.save.mockImplementation((data) => Promise.resolve(data));

      const dto: UpdateProductVariantDto = { sku: 'SAME-SKU' };
      const result = await service.update('variant-1', 'user-1', dto);

      expect(variantRepo.findOne).toHaveBeenCalledTimes(1);
      expect(result.sku).toBe('SAME-SKU');
    });

    it('PV-UNIT-056: giữ nguyên field khi dto rỗng (partial update)', async () => {
      const variant = makeVariantWithProduct({
        price: 100000,
        stockQty: 10,
        attributes: { color: 'red' },
        imageUrl: 'http://old',
      });
      variantRepo.findOne.mockResolvedValue(variant);
      variantRepo.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update('variant-1', 'user-1', {});

      expect(result.price).toBe(100000);
      expect(result.stockQty).toBe(10);
      expect(result.attributes).toEqual({ color: 'red' });
      expect(result.imageUrl).toBe('http://old');
    });

    it('PV-UNIT-057 (GAP - BR-08): update() vẫn cập nhật thành công dù shop đang SUSPENDED', async () => {
      // Ghi chú: tương tự PV-UNIT-031, update() không kiểm tra shop.status trước khi lưu.
      const variant = makeVariantWithProduct({
        product: {
          id: 'product-1',
          shop: { userId: 'user-1', status: 'SUSPENDED' },
        },
      });
      variantRepo.findOne.mockResolvedValue(variant);
      variantRepo.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update('variant-1', 'user-1', {
        price: 500,
      });

      expect(result.price).toBe(500);
    });
  });

  // ------------------------------------------------------------------
  // ProductVariant entity — PV-UNIT-058
  // ------------------------------------------------------------------
  describe('ProductVariant entity', () => {
    it('PV-UNIT-058: availableQty tính đúng = stockQty - reservedQty', () => {
      const variant = new ProductVariant();
      variant.stockQty = 20;
      variant.reservedQty = 5;

      expect(variant.availableQty).toBe(15);
    });
  });
});
