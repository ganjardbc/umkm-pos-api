import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { QueryReportDto } from './dto/query-report.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(PermissionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get('summary')
  @RequirePermission('report.read')
  @ApiOperation({
    summary: 'Sales summary — total revenue & transactions (from daily_reports)',
  })
  @ApiResponse({ status: 200, description: 'Aggregated sales summary' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  getSummary(
    @CurrentUser('merchant_id') merchantId: string,
    @Query() dto: QueryReportDto,
  ) {
    return this.reportsService.getSummary(merchantId, dto);
  }

  @Get('daily')
  @RequirePermission('report.read')
  @ApiOperation({
    summary: 'Daily reports list — rows from daily_reports table',
  })
  @ApiResponse({ status: 200, description: 'Daily report rows' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  getDailyReports(
    @CurrentUser('merchant_id') merchantId: string,
    @Query() dto: QueryReportDto,
  ) {
    return this.reportsService.getDailyReports(merchantId, dto);
  }

  @Get('top-products')
  @RequirePermission('report.read')
  @ApiOperation({
    summary: 'Top products — ranked by total revenue within date range',
  })
  @ApiResponse({ status: 200, description: 'Top products list' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Outlet not found' })
  getTopProducts(
    @CurrentUser('merchant_id') merchantId: string,
    @Query() dto: QueryReportDto,
  ) {
    return this.reportsService.getTopProducts(merchantId, dto);
  }

  @Get('outlet-comparison')
  @RequirePermission('report.read')
  @ApiOperation({
    summary: 'Outlet comparison — revenue & transaction count per outlet',
  })
  @ApiResponse({ status: 200, description: 'Per-outlet revenue comparison' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  getOutletComparison(
    @CurrentUser('merchant_id') merchantId: string,
    @Query() dto: QueryReportDto,
  ) {
    return this.reportsService.getOutletComparison(merchantId, dto);
  }

  @Get('dashboard')
  @RequirePermission('report.read')
  @ApiOperation({
    summary:
      'Dashboard — combined summary, top products & outlet comparison in one call',
  })
  @ApiResponse({ status: 200, description: 'Full dashboard data' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  getDashboard(
    @CurrentUser('merchant_id') merchantId: string,
    @Query() dto: QueryReportDto,
  ) {
    return this.reportsService.getDashboard(merchantId, dto);
  }
}
