import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { ShowRoomDto } from './dto/showRoom.dto';
import { Room } from './rooms.schema';
import { AuthGuard } from '@nestjs/passport';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async showRoomList(@Query() showRoomDto: ShowRoomDto): Promise<Room[]> {
    return this.roomsService.showRoomList(showRoomDto);
  }
}
