import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { ShowRoomDto } from './dto/showRoom.dto';
import { Room } from './rooms.schema';
import { CreateRoomDto } from './dto/createRoom.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async createRoom(@Body() createRoomDto: CreateRoomDto): Promise<Room> {
    return this.roomsService.createRoom(createRoomDto);
  }

  @Get()
  async showRoomList(@Query() showRoomDto: ShowRoomDto): Promise<Room[]> {
    return this.roomsService.showRoomList(showRoomDto);
  }
}
