import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { ShowRoomDto } from './dto/show-room.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.createRoom(createRoomDto);
  }

  @Get()
  async showRoomList(@Query() query: ShowRoomDto) {
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
