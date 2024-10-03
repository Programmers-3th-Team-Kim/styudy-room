import { Controller, Req, UseGuards, Patch, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/updateUserProfile.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  async updateUserProfile(
    @Req() req,
    @Body() updateUserProfileDto: UpdateUserProfileDto
  ) {
    console.log(req);
    const userId = req.user.id;
    console.log(userId);
    return this.usersService.updateProfile(userId, updateUserProfileDto);
  }
}
