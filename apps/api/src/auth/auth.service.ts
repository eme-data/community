import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: { email: string; password: string; name?: string; tenantName: string; tenantSlug: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new BadRequestException('Email already registered');

    const slugTaken = await this.prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
    if (slugTaken) throw new BadRequestException('Tenant slug already taken');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        memberships: {
          create: {
            role: 'OWNER',
            tenant: {
              create: { slug: input.tenantSlug, name: input.tenantName },
            },
          },
        },
      },
      include: { memberships: { include: { tenant: true } } },
    });

    return this.issueToken(user.id, user.memberships[0].tenantId);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { tenant: true } } },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (user.memberships.length === 0) throw new UnauthorizedException('No tenant assigned');

    return this.issueToken(user.id, user.memberships[0].tenantId);
  }

  private issueToken(userId: string, tenantId: string) {
    const token = this.jwt.sign({ sub: userId, tenantId });
    return { accessToken: token, tenantId, userId };
  }
}
