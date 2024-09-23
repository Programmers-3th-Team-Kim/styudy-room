import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RequestRoomDto } from './dto/requestRoom.dto';
import { Room } from './rooms.schema';
import { AuthGuard } from '@nestjs/passport';
import { CreateRoomDto } from './dto/createRoom.dto';
import { ResponseRoomDto } from './dto/responseRoom.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createRoom(
    @Body() createRoomDto: CreateRoomDto,
    @Req() req: any
  ): Promise<Room> {
    return this.roomsService.createRoom(createRoomDto, req.user.userId);
  }

  @Get()
  async showRoomList(
    @Query() requestRoomDTO: RequestRoomDto
  ): Promise<ResponseRoomDto[]> {
    return this.roomsService.showRoomList(requestRoomDTO);
  }
}
