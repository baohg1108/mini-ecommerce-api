import {
  Controller,
  Post,
  Get,
  Param,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { ReviewEligibilityGuard } from '../../common/guards/review-eligibility.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { ReviewsService } from './reviews.service';
import type { RequestWithUser } from '../../common/types/request-with-user.type';
import { IsPublic } from '../../common/decorators/public.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @UseGuards(AccessTokenGuard, ReviewEligibilityGuard)
  @Post()
  create(@Body() dto: CreateReviewDto, @Req() req: RequestWithUser) {
    return this.reviewsService.createReview(req.user.sub, req.orderItem!, dto);
  }

  @Get('product/:productId')
  @IsPublic()
  getByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @Patch(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reviewsService.replyReview(id, req.user.sub, dto);
  }
}
