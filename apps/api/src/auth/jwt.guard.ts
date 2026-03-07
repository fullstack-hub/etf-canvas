import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER!;
const JWKS = createRemoteJWKSet(new URL(`${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`));

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = auth.slice(7);
    try {
      const { payload } = await jwtVerify(token, JWKS, { issuer: KEYCLOAK_ISSUER });
      req.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
