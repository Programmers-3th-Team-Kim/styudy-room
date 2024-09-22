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
} from '@nestjs/common';
import { PlannersService } from './planners.service';
import { Planner } from './planners.schema';
import { PlannerDto } from './dto/planner.dto';
import { Types } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';

@Controller('planners')
export class PlannersController {
  constructor(private readonly plannersService: PlannersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() createPlanDto: PlannerDto): Promise<Planner> {
    return this.plannersService.createPlan(createPlanDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll(@Query('date') date: string): Promise<Planner[]> {
    return this.plannersService.showAll(date);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':plannerId')
  async update(
    @Param('plannerId') plannerId: Types.ObjectId,
    @Body() updatePlannerDto: PlannerDto
  ): Promise<Planner> {
    return this.plannersService.updatePlan(plannerId, updatePlannerDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':plannerId')
  async delete(
    @Param('plannerId') plannerId: Types.ObjectId
  ): Promise<Planner> {
    return this.plannersService.deletePlan(plannerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('completed/:plannerId')
  async toggle(
    @Param('plannerId') plannerId: Types.ObjectId
  ): Promise<Planner> {
    return this.plannersService.toggleIsComplete(plannerId);
  }
}
