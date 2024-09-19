import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { PlannersService } from './planners.service';
import { Planner } from './planners.schema';
import { PlannerDto } from './dto/planner.dto';

@Controller('planners')
export class PlannersController {
  constructor(private readonly plannersService: PlannersService) {}

  @Post()
  async create(@Body() createPlanDto: PlannerDto): Promise<Planner> {
    return this.plannersService.create(createPlanDto);
  }

  @Get()
  async findAll(): Promise<Planner[]> {
    return this.plannersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Planner> {
    return this.plannersService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePlannerDto: PlannerDto
  ): Promise<Planner> {
    return this.plannersService.update(id, updatePlannerDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Planner> {
    return this.plannersService.delete(id);
  }
}
