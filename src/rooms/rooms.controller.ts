import { Controller, Get, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { ShowRoomDto } from './dto/showRoom.dto';
import { Room } from './rooms.schema';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async showRoomList(@Query() query: ShowRoomDto): Promise<Room[]> {
    const { search, isPublic, isPossible, limit, offset } = query;

    return this.roomsService.showRoomList(
      search,
      isPublic,
      isPossible,
      limit,
      offset
    );
  }
}
