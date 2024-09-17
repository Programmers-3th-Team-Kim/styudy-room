import { Controller, Get, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { ShowRoomDto } from './dto/showRoom.dto';
import { Room } from './rooms.schema';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async showRoomList(@Query() showRoomDto: ShowRoomDto): Promise<Room[]> {
    return this.roomsService.showRoomList(showRoomDto);
  }
}
