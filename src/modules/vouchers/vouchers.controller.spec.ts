import { Test, TestingModule } from '@nestjs/testing';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dtos/create-voucher.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('VouchersController', () => {
  let controller: VouchersController;

  const mockVouchersService = {
    createVoucher: jest.fn(),
  };

  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VouchersController],
      providers: [{ provide: VouchersService, useValue: mockVouchersService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<VouchersController>(VouchersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createVoucher', () => {
    it('should call vouchersService.createVoucher with user id and dto', () => {
      const dto = {
        code: 'SALE10',
        discountPercent: 10,
      } as CreateVoucherDto;
      const expected = { id: 'voucher-1', code: 'SALE10' };
      mockVouchersService.createVoucher.mockReturnValue(expected);

      const result = controller.createVoucher(userId, dto);

      expect(mockVouchersService.createVoucher).toHaveBeenCalledWith(
        userId,
        dto,
      );
      expect(result).toBe(expected);
    });
  });
});
