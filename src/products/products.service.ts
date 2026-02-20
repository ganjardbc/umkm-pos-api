import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  async findAll(merchantId: string) {
    return this.prisma.products.findMany({
      where: { merchant_id: merchantId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, merchantId: string) {
    const product = await this.prisma.products.findFirst({
      where: { id, merchant_id: merchantId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto, merchantId: string, userId: string) {
    // Slug must be unique per merchant
    const existing = await this.prisma.products.findFirst({
      where: { merchant_id: merchantId, slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Product slug already exists for this merchant');
    }

    return this.prisma.products.create({
      data: {
        ...dto,
        merchant_id: merchantId,
        price: dto.price,
        cost: dto.cost ?? 0,
        stock_qty: dto.stock_qty ?? 0,
        min_stock: dto.min_stock ?? 0,
        is_active: dto.is_active ?? true,
        created_by: userId,
        updated_by: userId,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    merchantId: string,
    userId: string,
  ) {
    // Ensure product exists and belongs to this merchant
    await this.findOne(id, merchantId);

    // Check slug uniqueness if being updated
    if (dto.slug) {
      const conflict = await this.prisma.products.findFirst({
        where: { merchant_id: merchantId, slug: dto.slug },
      });

      if (conflict && conflict.id !== id) {
        throw new ConflictException('Product slug already exists for this merchant');
      }
    }

    return this.prisma.products.update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

  async remove(id: string, merchantId: string) {
    // Ensure product exists and belongs to this merchant
    await this.findOne(id, merchantId);

    return this.prisma.products.delete({
      where: { id },
    });
  }
}
