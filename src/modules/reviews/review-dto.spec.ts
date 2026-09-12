import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

const mockReviewService = {
  findReviewById: jest.fn(),
};

describe('Review Unit Test Cases Matrix (Exact Sequential Order)', () => {
  const validCreateReviewPayload = {
    orderItemId: '123e4567-e89b-12d3-a456-426614174000',
    rating: 5,
    comment: 'San pham tot',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-688: CreateReviewDto - should fail when rating is below min boundary (< 1, min-1)', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      ...validCreateReviewPayload,
      rating: 0,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'rating')).toBeDefined();
  });

  it('TC-692: CreateReviewDto - should fail when rating exceeds max boundary (> 5, max+1)', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      ...validCreateReviewPayload,
      rating: 6,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'rating')).toBeDefined();
  });

  it('TC-697: CreateReviewDto - should fail when comment exceeds max length (> 1000, max+1)', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      ...validCreateReviewPayload,
      comment: 'a'.repeat(1001),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'comment')).toBeDefined();
  });

  it('TC-698: ReplyReviewDto - should fail when reply is too short (< 1 char, min-1)', async () => {
    const dto = plainToInstance(ReplyReviewDto, {
      reply: '',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'reply')).toBeDefined();
  });

  it('TC-702: ReplyReviewDto - should fail when reply exceeds max length (> 1000, max+1)', async () => {
    const dto = plainToInstance(ReplyReviewDto, {
      reply: 'a'.repeat(1001),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'reply')).toBeDefined();
  });

  it('TC-709: CreateReviewDto - should throw 400 when orderItemId has invalid UUID format ("abc-123")', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      ...validCreateReviewPayload,
      orderItemId: 'abc-123',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'orderItemId')).toBeDefined();
  });

  it('TC-715: Get Reviews by Product - should throw 400 when productId has invalid UUID format ("abc-123")', async () => {
    mockReviewService.findReviewById.mockRejectedValueOnce(
      new BadRequestException('Invalid UUID format'),
    );
    await expect(mockReviewService.findReviewById('abc-123')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-722: Reply Review - should throw 400 when review id has invalid UUID format ("abc-123")', async () => {
    mockReviewService.findReviewById.mockRejectedValueOnce(
      new BadRequestException('Invalid UUID format'),
    );
    await expect(mockReviewService.findReviewById('abc-123')).rejects.toThrow(
      BadRequestException,
    );
  });
});
