import { Controller, Get, Patch, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtGuard } from '../auth/jwt.guard';
import { UpdateUserDto } from './user.dto';

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
  updateMe(@Req() req: any, @Body() body: UpdateUserDto) {
    return this.svc.update(req.userId, body);
  }

  @Delete('me')
  withdraw(@Req() req: any) {
    return this.svc.withdraw(req.userId);
  }
}
