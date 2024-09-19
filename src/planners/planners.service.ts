import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Planner, PlannerDocument } from './planners.schema';

@Injectable()
export class PlannersService {
  constructor(
    @InjectModel(Planner.name) private plannerModel: Model<PlannerDocument>
  ) {}

  async create(plannerDto: Partial<Planner>): Promise<Planner> {
    try {
      const newPlanner = new this.plannerModel(plannerDto);
      console.log(newPlanner.save);
      return newPlanner.save();
    } catch (error) {
      console.log(error);
    }
  }

  async findAll(): Promise<Planner[]> {
    return this.plannerModel.find().exec();
  }

  async findOne(id: string): Promise<Planner> {
    return this.plannerModel.findById(id).exec();
  }

  async update(id: string, plannerDto: Partial<Planner>): Promise<Planner> {
    return this.plannerModel
      .findByIdAndUpdate(id, plannerDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Planner> {
    return this.plannerModel.findByIdAndDelete(id).exec();
  }
}
