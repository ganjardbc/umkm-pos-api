import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

/**
 * Auth Service
 * Handles authentication logic
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  /**
   * User login
   * Validates credentials and returns JWT token
   */
  async login(dto: LoginDto) {
    // Find user by email with merchant_id (compound unique key)
    // We need to find first since email alone is not unique
    const user = await this.prisma.users.findFirst({
      where: { email: dto.email },
      include: {
        merchants: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const token = await this.generateToken(user.id, user.email);

    return {
      access_token: token,
      token_type: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        merchant_id: user.merchant_id,
        merchant: user.merchants,
        is_active: user.is_active,
      },
    };
  }

  /**
   * User registration
   * Creates new user account
   */
  async register(dto: RegisterDto) {
    // Check if email already exists for this merchant
    const existingUser = await this.prisma.users.findFirst({
      where: {
        merchant_id: dto.merchant_id,
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered for this merchant');
    }

    // Verify merchant exists
    const merchant = await this.prisma.merchants.findUnique({
      where: { id: dto.merchant_id },
    });

    if (!merchant) {
      throw new BadRequestException('Merchant not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate username from email (before @)
    const username = dto.email.split('@')[0];

    // Create user
    const user = await this.prisma.users.create({
      data: {
        name: dto.name,
        email: dto.email,
        username: username,
        password_hash: hashedPassword,
        merchant_id: dto.merchant_id,
        is_active: true,
      },
      include: {
        merchants: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Generate JWT token
    const token = await this.generateToken(user.id, user.email);

    return {
      access_token: token,
      token_type: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        merchant_id: user.merchant_id,
        merchant: user.merchants,
        is_active: user.is_active,
      },
    };
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        merchants: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generate JWT token
   */
  private async generateToken(userId: string, email: string): Promise<string> {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
