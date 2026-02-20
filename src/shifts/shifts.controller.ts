import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
// import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Shifts')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(PermissionGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) { }

  @Post()
  // @RequirePermission('shift.create')
  @ApiOperation({ summary: 'Open a new cashier shift for an outlet' })
  @ApiResponse({ status: 201, description: 'Shift opened successfully' })
  @ApiResponse({ status: 400, description: 'User already has an open shift in this outlet' })
  @ApiResponse({ status: 401, description: 'Outlet does not belong to merchant' })
  open(
    @Body() dto: CreateShiftDto,
    @CurrentUser('merchant_id') merchantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.shiftsService.open(dto, merchantId, userId);
  }

  @Get()
  // @RequirePermission('shift.read')
  @ApiOperation({ summary: 'List all shifts (merchant-scoped, optionally by outlet)' })
  @ApiQuery({ name: 'outlet_id', required: false, description: 'Filter by outlet ID' })
  @ApiResponse({ status: 200, description: 'Return all shifts with outlet and user info (paginated)' })
  findAll(
    @CurrentUser('merchant_id') merchantId: string,
    @Query('outlet_id') outletId?: string,
    @Query() pagination?: PaginationDto,
  ) {
    return this.shiftsService.findAll(merchantId, outletId, pagination);
  }

  @Get(':id')
  // @RequirePermission('shift.read')
  @ApiOperation({ summary: 'Get shift by ID (merchant-scoped, includes transactions)' })
  @ApiResponse({ status: 200, description: 'Return shift details with transactions' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
  ) {
    return this.shiftsService.findOne(id, merchantId);
  }

  @Patch(':id/close')
  // @RequirePermission('shift.update')
  @ApiOperation({ summary: 'Close an open cashier shift' })
  @ApiResponse({ status: 200, description: 'Shift closed successfully' })
  @ApiResponse({ status: 400, description: 'Shift is already closed' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  close(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.shiftsService.close(id, merchantId, userId);
  }
}
