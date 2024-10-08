import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Planner, PlannerSchema } from './planners.schema';
import { PlannersService } from './planners.service';
import { PlannersController } from './planners.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Planner.name, schema: PlannerSchema }]),
  ],
  controllers: [PlannersController],
  providers: [PlannersService],
  exports: [PlannersService],
})
export class PlannersModule {}
