import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly apiKey = process.env.ADMIN_API_KEY || '';

  canActivate(context: ExecutionContext): boolean {
    if (!this.apiKey) return false;
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-api-key'];
    if (key !== this.apiKey) throw new UnauthorizedException('Invalid API Key');
    return true;
  }
}
