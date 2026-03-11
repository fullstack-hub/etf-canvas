import { Controller, Get, Patch, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('user')
@UseGuards(JwtGuard)
@ApiBearerAuth('jwt')
export class UserController {
  constructor(private readonly svc: UserService) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.svc.getOrCreate(req.userId, req.provider);
  }

  @Patch('me')
  updateMe(
    @Req() req: any,
    @Body() body: {
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
    },
  ) {
    return this.svc.update(req.userId, body);
  }

  @Delete('me')
  withdraw(@Req() req: any) {
    return this.svc.withdraw(req.userId);
  }
}
