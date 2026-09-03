import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { StatisticsService } from './statistics.service';
import { StatisticsQueryDto } from './dto/statistics-query.dto';

@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get('revenue-orders')
  getRevenueAndOrders(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getRevenueAndOrderStats(query);
  }

  @Get('top-shops')
  getTopShops(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getTopShops(query);
  }

  @Get('top-products')
  getTopProducts(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getTopProducts(query);
  }
}
