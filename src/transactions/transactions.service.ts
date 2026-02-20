import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) { }

  async findAll(merchantId: string, outletId?: string) {
    const outletWhere = outletId ? { id: outletId, merchant_id: merchantId } : { merchant_id: merchantId };

    // Validate outlet belongs to this merchant if outletId given
    if (outletId) {
      const outlet = await this.prisma.outlets.findFirst({ where: outletWhere });
      if (!outlet) {
        throw new NotFoundException(`Outlet with ID ${outletId} not found`);
      }
    }

    // Collect outlet IDs that belong to this merchant
    const outlets = await this.prisma.outlets.findMany({
      where: { merchant_id: merchantId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    return this.prisma.transactions.findMany({
      where: {
        outlet_id: outletId ? outletId : { in: outletIds },
      },
      include: {
        transaction_items: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, merchantId: string) {
    const outlets = await this.prisma.outlets.findMany({
      where: { merchant_id: merchantId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    const transaction = await this.prisma.transactions.findFirst({
      where: {
        id,
        outlet_id: { in: outletIds },
      },
      include: {
        transaction_items: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async create(dto: CreateTransactionDto, merchantId: string, userId: string) {
    // 1. Validate outlet belongs to this merchant
    const outlet = await this.prisma.outlets.findFirst({
      where: { id: dto.outlet_id, merchant_id: merchantId },
    });
    if (!outlet) {
      throw new UnauthorizedException(
        `Outlet with ID ${dto.outlet_id} does not belong to your merchant`,
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Transaction must have at least one item');
    }

    // 2. Fetch all products (merchant-scoped) and validate stock
    const productIds = dto.items.map((i) => i.product_id);
    const products = await this.prisma.products.findMany({
      where: {
        id: { in: productIds },
        merchant_id: merchantId,
        is_active: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found or inactive');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 3. Validate stock availability
    let totalAmount = 0;
    const itemsData: {
      product_id: string;
      product_name_snapshot: string;
      price_snapshot: number;
      qty: number;
      subtotal: number;
    }[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.product_id)!;
      if (product.stock_qty < item.qty) {
        throw new BadRequestException(
          `Insufficient stock for product "${product.name}". Available: ${product.stock_qty}, Requested: ${item.qty}`,
        );
      }

      const price = Number(product.price);
      const subtotal = price * item.qty;
      totalAmount += subtotal;

      itemsData.push({
        product_id: product.id,
        product_name_snapshot: product.name,
        price_snapshot: price,
        qty: item.qty,
        subtotal,
      });
    }

    // 4. Atomic DB transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.transactions.create({
        data: {
          outlet_id: dto.outlet_id,
          user_id: userId,
          shift_id: dto.shift_id ?? null,
          payment_method: dto.payment_method,
          total_amount: totalAmount,
          is_offline: dto.is_offline ?? false,
          device_id: dto.device_id ?? null,
          created_by: userId,
          updated_by: userId,
        },
      });

      // Create transaction items (snapshot price)
      await tx.transaction_items.createMany({
        data: itemsData.map((item) => ({
          transaction_id: transaction.id,
          product_id: item.product_id,
          product_name_snapshot: item.product_name_snapshot,
          price_snapshot: item.price_snapshot,
          qty: item.qty,
          subtotal: item.subtotal,
          created_by: userId,
          updated_by: userId,
        })),
      });

      // Decrement product stock and write stock_logs
      for (const item of itemsData) {
        await tx.products.update({
          where: { id: item.product_id },
          data: {
            stock_qty: { decrement: item.qty },
            updated_by: userId,
            updated_at: new Date(),
          },
        });

        await tx.stock_logs.create({
          data: {
            product_id: item.product_id,
            change_qty: -item.qty,
            reason: 'sale',
            ref_id: transaction.id,
            created_by: userId,
            updated_by: userId,
          },
        });
      }

      return transaction;
    });

    // Return full transaction with items
    return this.prisma.transactions.findFirst({
      where: { id: result.id },
      include: { transaction_items: true },
    });
  }
}
