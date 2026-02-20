import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.merchants.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const merchant = await this.prisma.merchants.findUnique({
      where: { id },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant with ID ${id} not found`);
    }

    return merchant;
  }

  async findBySlug(slug: string) {
    const merchant = await this.prisma.merchants.findUnique({
      where: { slug },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant with slug ${slug} not found`);
    }

    return merchant;
  }

  async create(dto: CreateMerchantDto, userId?: string) {
    // Check if slug already exists
    const existing = await this.prisma.merchants.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Merchant slug already exists');
    }

    return this.prisma.merchants.create({
      data: {
        ...dto,
        created_by: userId,
        updated_by: userId,
      },
    });
  }

  async update(id: string, dto: UpdateMerchantDto, userId?: string) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.merchants.findUnique({
        where: { slug: dto.slug },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Merchant slug already exists');
      }
    }

    return this.prisma.merchants.update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.merchants.delete({
      where: { id },
    });
  }
}
