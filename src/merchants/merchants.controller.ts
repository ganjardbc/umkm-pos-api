import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Merchants')
@ApiBearerAuth()
@Controller('merchants')
@UseGuards(PermissionGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) { }

  @Post()
  @RequirePermission('merchants.create')
  @ApiOperation({ summary: 'Create a new merchant' })
  @ApiResponse({ status: 201, description: 'Merchant created successfully' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  create(
    @Body() dto: CreateMerchantDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.merchantsService.create(dto, userId);
  }

  @Get()
  @RequirePermission('merchants.read')
  @ApiOperation({ summary: 'Get all merchants' })
  @ApiResponse({ status: 200, description: 'Return all merchants (paginated)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.merchantsService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermission('merchants.read')
  @ApiOperation({ summary: 'Get merchant by ID' })
  @ApiResponse({ status: 200, description: 'Return merchant details' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  findOne(@Param('id') id: string) {
    return this.merchantsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('merchants.update')
  @ApiOperation({ summary: 'Update merchant details' })
  @ApiResponse({ status: 200, description: 'Merchant updated successfully' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.merchantsService.update(id, dto, userId);
  }

  @Delete(':id')
  @RequirePermission('merchants.delete')
  @ApiOperation({ summary: 'Delete a merchant' })
  @ApiResponse({ status: 200, description: 'Merchant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  remove(@Param('id') id: string) {
    return this.merchantsService.remove(id);
  }
}
