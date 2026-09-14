import { Test, TestingModule } from '@nestjs/testing';
import {
  ProductVariantController,
  VariantController,
} from './product-variant.controller';
import { ProductVariantService } from './product-variant.service';
import { CreateProductVariantDto } from './dtos/create-product-variant.dto';
import { UpdateProductVariantDto } from './dtos/update-product-variant.dto';
import { UpsertVariantsDto } from './dtos/upsert-variant.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('ProductVariantController', () => {
  let controller: ProductVariantController;

  const mockVariantService = {
    findByProduct: jest.fn(),
    create: jest.fn(),
    Upsert: jest.fn(),
    findById: jest.fn(),
    findBySku: jest.fn(),
    update: jest.fn(),
  };

  const productId = 'product-1';
  const userId = 'seller-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductVariantController],
      providers: [
        { provide: ProductVariantService, useValue: mockVariantService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ProductVariantController>(ProductVariantController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByProduct', () => {
    it('should call variantService.findByProduct with the product id', () => {
      const expected = [{ id: 'variant-1' }];
      mockVariantService.findByProduct.mockReturnValue(expected);

      const result = controller.findByProduct(productId);

      expect(mockVariantService.findByProduct).toHaveBeenCalledWith(productId);
      expect(result).toBe(expected);
    });
  });

  describe('create', () => {
    it('should call variantService.create with product id, user id and dto', async () => {
      const dto = { sku: 'SKU-1' } as CreateProductVariantDto;
      const expected = { id: 'variant-1', sku: 'SKU-1' };
      mockVariantService.create.mockResolvedValue(expected);

      const result = await controller.create(productId, userId, dto);

      expect(mockVariantService.create).toHaveBeenCalledWith(
        productId,
        userId,
        dto,
      );
      expect(result).toBe(expected);
    });
  });

  describe('Upsert', () => {
    it('should call variantService.Upsert with product id, user id and dto', async () => {
      const dto = { variants: [] } as unknown as UpsertVariantsDto;
      const expected = { created: 0, updated: 0 };
      mockVariantService.Upsert.mockResolvedValue(expected);

      const result = await controller.Upsert(productId, userId, dto);

      expect(mockVariantService.Upsert).toHaveBeenCalledWith(
        productId,
        userId,
        dto,
      );
      expect(result).toBe(expected);
    });
  });
});

describe('VariantController', () => {
  let controller: VariantController;

  const mockVariantService = {
    findById: jest.fn(),
    findBySku: jest.fn(),
    update: jest.fn(),
  };

  const variantId = 'variant-1';
  const userId = 'seller-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariantController],
      providers: [
        { provide: ProductVariantService, useValue: mockVariantService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<VariantController>(VariantController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findById', () => {
    it('should call variantService.findById with the id', async () => {
      const expected = { id: variantId };
      mockVariantService.findById.mockResolvedValue(expected);

      const result = await controller.findById(variantId);

      expect(mockVariantService.findById).toHaveBeenCalledWith(variantId);
      expect(result).toBe(expected);
    });
  });

  describe('findBySku', () => {
    it('should call variantService.findBySku with the sku', async () => {
      const sku = 'SKU-1';
      const expected = { id: variantId, sku };
      mockVariantService.findBySku.mockResolvedValue(expected);

      const result = await controller.findBySku(sku);

      expect(mockVariantService.findBySku).toHaveBeenCalledWith(sku);
      expect(result).toBe(expected);
    });
  });

  describe('update', () => {
    it('should call variantService.update with id, user id and dto', async () => {
      const dto = { price: 100000 } as UpdateProductVariantDto;
      const expected = { id: variantId, price: 100000 };
      mockVariantService.update.mockResolvedValue(expected);

      const result = await controller.update(variantId, userId, dto);

      expect(mockVariantService.update).toHaveBeenCalledWith(
        variantId,
        userId,
        dto,
      );
      expect(result).toBe(expected);
    });
  });
});
