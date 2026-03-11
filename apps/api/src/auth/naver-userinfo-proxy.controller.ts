import { Controller, Get, Headers, HttpException } from '@nestjs/common';

@Controller('auth/naver-userinfo')
export class NaverUserinfoProxyController {
  @Get()
  async proxy(@Headers('authorization') auth: string) {
    if (!auth) throw new HttpException('missing authorization', 401);
    if (!auth.startsWith('Bearer ') || auth.length < 20) {
      throw new HttpException('invalid authorization format', 401);
    }

    const resp = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: auth },
    });

    const json = (await resp.json()) as {
      resultcode: string;
      response?: { id: string; name?: string; email?: string; profile_image?: string; nickname?: string };
    };

    if (json.resultcode !== '00' || !json.response) {
      throw new HttpException('naver userinfo failed', resp.status);
    }

    const p = json.response;
    return {
      sub: p.id,
      name: p.name,
      email: p.email,
      picture: p.profile_image,
      nickname: p.nickname,
    };
  }
}
