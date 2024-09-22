import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { PlannersService } from './planners.service';
import { Planner } from './planners.schema';
import { PlannerDto } from './dto/planner.dto';

@Controller('planners')
export class PlannersController {
  constructor(private readonly plannersService: PlannersService) {}

  @Post()
  async create(@Body() createPlanDto: PlannerDto): Promise<Planner> {
    return this.plannersService.createPlan(createPlanDto);
  }

  @Get()
  async findAll(@Query('date') date: string): Promise<Planner[]> {
    return this.plannersService.showAll(date);
  }

  // @Get(':id')
  // async findOne(@Param('id') id: string): Promise<Planner> {
  //   return this.plannersService.findOne(id);
  // }

  @Put(':plannerId')
  async update(
    @Param('plannerId') plannerId: string,
    @Body() updatePlannerDto: PlannerDto
  ): Promise<Planner> {
    return this.plannersService.updatePlan(plannerId, updatePlannerDto);
  }

  @Delete(':plannerId')
  async delete(@Param('plannerId') plannerId: string): Promise<Planner> {
    return this.plannersService.deletePlan(plannerId);
  }
}
