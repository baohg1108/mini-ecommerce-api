import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CartService } from '../cart/cart.service';
import { PaymentService } from '../payment/payment.service';
import { ProductVariantService } from '../product-variant/product-variant.service';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

describe('OrdersService - checkout transaction rollback', () => {
  let service: OrdersService;
  let mockManager: {
    save: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let callCount: number;

  beforeEach(async () => {
    callCount = 0;

    mockManager = {
      save: jest.fn(),
      create: jest.fn((_entity: unknown, data: unknown) => data),
      delete: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn(() => {
          callCount++;
          return Promise.resolve({
            id: `variant-${callCount}`,
            availableQty: callCount === 1 ? 10 : 1,
            reservedQty: 0,
            attributes: {},
          });
        }),
      })),
    };

    const mockDataSource: Partial<DataSource> = {
      transaction: jest
        .fn()
        .mockImplementation(
          (cb: (manager: EntityManager) => Promise<unknown>) =>
            cb(mockManager as unknown as EntityManager),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: {} },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(Shop), useValue: {} },
        {
          provide: CartService,
          useValue: {
            getGroupedCartForCheckout: jest.fn().mockResolvedValue([
              {
                shop: { id: 'shop-1' },
                items: [
                  {
                    variantId: 'variant-1',
                    quantity: 2,
                    price: 1000,
                    productName: 'Product A',
                    stockQty: 10,
                  },
                  {
                    variantId: 'variant-2',
                    quantity: 999,
                    price: 500,
                    productName: 'Product B',
                    stockQty: 10,
                  },
                ],
              },
            ]),
          },
        },
        { provide: PaymentService, useValue: { createForOrder: jest.fn() } },
        { provide: ProductVariantService, useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should throw and skip cart deletion when second item is out of stock (rollback)', async () => {
    await expect(
      service.checkout('user-1', {
        address: {
          recipientName: 'Test',
          phone: '0900000000',
          fullAddress: 'Test address',
        },
        paymentMethod: PaymentMethod.COD,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockManager.delete).not.toHaveBeenCalled();
  });
});
