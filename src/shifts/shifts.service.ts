import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';

export type ShiftStatus = 'open' | 'closed';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) { }

  async findAll(merchantId: string, outletId?: string) {
    // Validate outlet belongs to this merchant when outletId is provided
    if (outletId) {
      const outlet = await this.prisma.outlets.findFirst({
        where: { id: outletId, merchant_id: merchantId },
      });
      if (!outlet) {
        throw new NotFoundException(`Outlet with ID ${outletId} not found`);
      }
    }

    const outlets = await this.prisma.outlets.findMany({
      where: { merchant_id: merchantId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    return this.prisma.shifts.findMany({
      where: {
        outlet_id: outletId ? outletId : { in: outletIds },
      },
      include: {
        outlets: { select: { id: true, name: true, slug: true } },
        users: { select: { id: true, name: true, username: true } },
      },
      orderBy: { start_time: 'desc' },
    });
  }

  async findOne(id: string, merchantId: string) {
    const outlets = await this.prisma.outlets.findMany({
      where: { merchant_id: merchantId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    const shift = await this.prisma.shifts.findFirst({
      where: {
        id,
        outlet_id: { in: outletIds },
      },
      include: {
        outlets: { select: { id: true, name: true, slug: true } },
        users: { select: { id: true, name: true, username: true } },
        transactions: {
          select: {
            id: true,
            total_amount: true,
            payment_method: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    return shift;
  }

  async open(dto: CreateShiftDto, merchantId: string, userId: string) {
    // Validate outlet belongs to this merchant
    const outlet = await this.prisma.outlets.findFirst({
      where: { id: dto.outlet_id, merchant_id: merchantId },
    });
    if (!outlet) {
      throw new UnauthorizedException(
        `Outlet with ID ${dto.outlet_id} does not belong to your merchant`,
      );
    }

    // Prevent opening a second shift in the same outlet if one is already open
    const existingOpen = await this.prisma.shifts.findFirst({
      where: {
        outlet_id: dto.outlet_id,
        user_id: userId,
        status: 'open',
      },
    });
    if (existingOpen) {
      throw new BadRequestException(
        `You already have an open shift (ID: ${existingOpen.id}) in this outlet. Please close it first.`,
      );
    }

    return this.prisma.shifts.create({
      data: {
        outlet_id: dto.outlet_id,
        user_id: userId,
        start_time: new Date(),
        status: 'open' satisfies ShiftStatus,
        created_by: userId,
        updated_by: userId,
      },
      include: {
        outlets: { select: { id: true, name: true, slug: true } },
        users: { select: { id: true, name: true, username: true } },
      },
    });
  }

  async close(id: string, merchantId: string, userId: string) {
    const outlets = await this.prisma.outlets.findMany({
      where: { merchant_id: merchantId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    const shift = await this.prisma.shifts.findFirst({
      where: {
        id,
        outlet_id: { in: outletIds },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    if (shift.status === 'closed') {
      throw new BadRequestException(`Shift with ID ${id} is already closed`);
    }

    return this.prisma.shifts.update({
      where: { id },
      data: {
        end_time: new Date(),
        status: 'closed' satisfies ShiftStatus,
        updated_by: userId,
        updated_at: new Date(),
      },
      include: {
        outlets: { select: { id: true, name: true, slug: true } },
        users: { select: { id: true, name: true, username: true } },
      },
    });
  }
}
