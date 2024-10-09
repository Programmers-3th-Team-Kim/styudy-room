import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PlannersService } from './planners.service';
import { Planner } from './planners.schema';
import { PlannerDto } from './dto/planner.dto';
// import { Types } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';

@Controller('planners')
export class PlannersController {
  constructor(private readonly plannersService: PlannersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Req() req: any,
    @Body() createPlanDto: PlannerDto
  ): Promise<any> {
    const userId = req.user._id;
    return this.plannersService.createPlan(userId, createPlanDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll(
    @Req() req: any,
    @Query('date') date: string
  ): Promise<Planner[]> {
    const userId = req.user._id;
    console.log(userId);
    return this.plannersService.showAll(userId, date);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':plannerId')
  async update(
    @Req() req: any,
    @Param('plannerId') plannerId: string,
    @Body() updatePlannerDto: PlannerDto
  ): Promise<any> {
    const userId = req.user._id;
    return this.plannersService.updatePlan(userId, plannerId, updatePlannerDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':plannerId')
  async delete(
    @Req() req: any,
    @Param('plannerId') plannerId: string
  ): Promise<Planner> {
    const userId = req.user._id;
    return this.plannersService.deletePlan(userId, plannerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('completed/:plannerId')
  async toggle(
    @Req() req: any,
    @Param('plannerId') plannerId: string
  ): Promise<Planner> {
    const userId = req.user._id;
    return this.plannersService.toggleIsComplete(userId, plannerId);
  }
}
