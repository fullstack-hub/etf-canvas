import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

let _keycloakIssuer: string | null = null;
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export function getKeycloakIssuer(): string {
  if (!_keycloakIssuer) {
    _keycloakIssuer = process.env.KEYCLOAK_ISSUER!;
  }
  return _keycloakIssuer;
}

export function getJWKS() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(`${getKeycloakIssuer()}/protocol/openid-connect/certs`));
  }
  return _jwks;
}

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = auth.slice(7);
    try {
      const { payload } = await jwtVerify(token, getJWKS(), { issuer: getKeycloakIssuer() });
      req.userId = payload.sub;
      req.provider = (payload as any).identity_provider ?? null;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
