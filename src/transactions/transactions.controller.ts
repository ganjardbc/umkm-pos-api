import {
  Controller,
  Get,
  Post,
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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
// import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(PermissionGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  @Post()
  // @RequirePermission('transaction.create')
  @ApiOperation({ summary: 'Create a new transaction (POS checkout) — atomic' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully with items' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or invalid items' })
  @ApiResponse({ status: 404, description: 'Product or outlet not found' })
  create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser('merchant_id') merchantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transactionsService.create(dto, merchantId, userId);
  }

  @Get()
  // @RequirePermission('transaction.read')
  @ApiOperation({ summary: 'List all transactions (merchant-scoped, optionally by outlet)' })
  @ApiQuery({ name: 'outlet_id', required: false, description: 'Filter by outlet ID' })
  @ApiResponse({ status: 200, description: 'Return all transactions with items' })
  findAll(
    @CurrentUser('merchant_id') merchantId: string,
    @Query('outlet_id') outletId?: string,
    @Query() pagination?: PaginationDto,
  ) {
    return this.transactionsService.findAll(merchantId, outletId, pagination);
  }

  @Get(':id')
  // @RequirePermission('transaction.read')
  @ApiOperation({ summary: 'Get transaction by ID (merchant-scoped, includes items)' })
  @ApiResponse({ status: 200, description: 'Return transaction details with items' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
  ) {
    return this.transactionsService.findOne(id, merchantId);
  }
}
