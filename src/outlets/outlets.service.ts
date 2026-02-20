import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class OutletsService {
  constructor(private prisma: PrismaService) { }

  async findAll(merchantId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = pagination.skip;
    const where = { merchant_id: merchantId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.outlets.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.outlets.count({ where }),
    ]);

    return { data, meta: PaginationDto.calculateMeta(total, page, limit) };
  }

  async findOne(id: string, merchantId: string) {
    const outlet = await this.prisma.outlets.findFirst({
      where: { id, merchant_id: merchantId },
    });

    if (!outlet) {
      throw new NotFoundException(`Outlet with ID ${id} not found`);
    }

    return outlet;
  }

  async create(dto: CreateOutletDto, merchantId: string, userId: string) {
    // Slug must be unique per merchant
    const existing = await this.prisma.outlets.findFirst({
      where: { merchant_id: merchantId, slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Outlet slug already exists for this merchant');
    }

    return this.prisma.outlets.create({
      data: {
        ...dto,
        merchant_id: merchantId,
        is_active: dto.is_active ?? true,
        created_by: userId,
        updated_by: userId,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateOutletDto,
    merchantId: string,
    userId: string,
  ) {
    // Ensure outlet exists and belongs to this merchant
    await this.findOne(id, merchantId);

    // Check slug uniqueness if being updated
    if (dto.slug) {
      const conflict = await this.prisma.outlets.findFirst({
        where: { merchant_id: merchantId, slug: dto.slug },
      });

      if (conflict && conflict.id !== id) {
        throw new ConflictException('Outlet slug already exists for this merchant');
      }
    }

    return this.prisma.outlets.update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

  async remove(id: string, merchantId: string) {
    // Ensure outlet exists and belongs to this merchant
    await this.findOne(id, merchantId);

    return this.prisma.outlets.delete({
      where: { id },
    });
  }
}
