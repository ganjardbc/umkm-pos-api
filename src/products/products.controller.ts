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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
// import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';
import { PaginationDto } from '../common/dto/pagination.dto';



@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(PermissionGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  // @RequirePermission('product.create')
  @ApiOperation({ summary: 'Create a new product for the current merchant' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 409, description: 'Slug already exists for this merchant' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser('merchant_id') merchantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.create(dto, merchantId, userId);
  }

  @Get()
  // @RequirePermission('product.read')
  @ApiOperation({ summary: 'List all products for the current merchant' })
  @ApiResponse({ status: 200, description: 'Return all products (paginated)' })
  findAll(
    @CurrentUser('merchant_id') merchantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.productsService.findAll(merchantId, pagination);
  }

  @Get(':id')
  // @RequirePermission('product.read')
  @ApiOperation({ summary: 'Get product by ID (merchant-scoped)' })
  @ApiResponse({ status: 200, description: 'Return product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
  ) {
    return this.productsService.findOne(id, merchantId);
  }

  @Patch(':id')
  // @RequirePermission('product.update')
  @ApiOperation({ summary: 'Update product details (merchant-scoped)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Slug already exists for this merchant' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('merchant_id') merchantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.update(id, dto, merchantId, userId);
  }

  @Delete(':id')
  // @RequirePermission('product.delete')
  @ApiOperation({ summary: 'Delete a product (merchant-scoped)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
  ) {
    return this.productsService.remove(id, merchantId);
  }
}
