import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

// Admin merchant slug - users from this merchant can see all merchants
const ADMIN_MERCHANT_SLUG = 'merchant-admin';

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if user is admin (belongs to admin merchant)
   */
  private async isAdminUser(merchantId: string): Promise<boolean> {
    const merchant = await this.prisma.merchants.findUnique({
      where: { id: merchantId },
      select: { slug: true },
    });
    return merchant?.slug === ADMIN_MERCHANT_SLUG;
  }

  /**
   * Validate user has access to merchant
   */
  private async validateMerchantAccess(
    targetMerchantId: string,
    userMerchantId: string,
  ): Promise<void> {
    const isAdmin = await this.isAdminUser(userMerchantId);

    // Admin can access all merchants
    if (isAdmin) {
      return;
    }

    // Non-admin can only access their own merchant
    if (targetMerchantId !== userMerchantId) {
      throw new ForbiddenException('You do not have access to this merchant');
    }
  }

  async findAll(pagination: PaginationDto, userMerchantId: string) {
    const { page = 1, limit = 10 } = pagination;
    const skip = pagination.skip;

    // const isAdmin = await this.isAdminUser(userMerchantId);

    // Build where clause based on user type
    const where = { id: userMerchantId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.merchants.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.merchants.count({ where }),
    ]);

    return { data, meta: PaginationDto.calculateMeta(total, page, limit) };
  }

  async findOne(id: string, userMerchantId: string) {
    await this.validateMerchantAccess(id, userMerchantId);

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

  async update(
    id: string,
    dto: UpdateMerchantDto,
    userId?: string,
    userMerchantId?: string,
  ) {
    if (userMerchantId) {
      await this.validateMerchantAccess(id, userMerchantId);
      await this.findOne(id, userMerchantId);
    }

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

  async remove(id: string, userMerchantId?: string) {
    if (userMerchantId) {
      await this.validateMerchantAccess(id, userMerchantId);
      await this.findOne(id, userMerchantId);
    }

    return this.prisma.merchants.delete({
      where: { id },
    });
  }
}
