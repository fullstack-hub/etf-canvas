import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { getKeycloakIssuer, getJWKS } from './jwt.guard';
import { jwtVerify } from 'jose';

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return true;
    try {
      const issuer = getKeycloakIssuer();
      const jwks = getJWKS();
      const { payload } = await jwtVerify(auth.slice(7), jwks, { issuer });
      req.userId = payload.sub;
    } catch {}
    return true;
  }
}
