import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(keycloakId: string, provider?: string) {
    let user = await this.prisma.user.findUnique({ where: { keycloakId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { keycloakId, provider },
      });
    } else if (provider && !user.provider) {
      user = await this.prisma.user.update({
        where: { keycloakId },
        data: { provider },
      });
    }
    return user;
  }

  async update(keycloakId: string, data: {
    nickname?: string;
    name?: string;
    phone?: string;
    age?: string;
    gender?: string;
    investExp?: string;
    investStyle?: string;
    showAge?: boolean;
    showGender?: boolean;
    showInvestExp?: boolean;
    showInvestStyle?: boolean;
    thirdPartyConsent?: boolean;
  }) {
    const user = await this.prisma.user.findUnique({ where: { keycloakId } });
    if (!user) throw new NotFoundException();

    const consentUpdate: Record<string, any> = {};
    if (data.thirdPartyConsent !== undefined && data.thirdPartyConsent !== user.thirdPartyConsent) {
      if (data.thirdPartyConsent) {
        consentUpdate.consentAt = new Date();
        consentUpdate.consentRevokedAt = null;
      } else {
        consentUpdate.consentRevokedAt = new Date();
      }
    }

    return this.prisma.user.update({
      where: { keycloakId },
      data: { ...data, ...consentUpdate },
    });
  }

  async withdraw(keycloakId: string) {
    await this.prisma.$transaction([
      // 커뮤니티 글/댓글의 authorId를 null로 설정 (보존)
      this.prisma.post.updateMany({ where: { authorId: keycloakId }, data: { authorId: null } }),
      this.prisma.comment.updateMany({ where: { authorId: keycloakId }, data: { authorId: null } }),
      // 포트폴리오 삭제
      this.prisma.portfolio.deleteMany({ where: { userId: keycloakId } }),
      // 유저 삭제
      this.prisma.user.delete({ where: { keycloakId } }),
    ]);
    return { ok: true };
  }
}
