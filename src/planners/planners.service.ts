import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Planner, PlannerDocument } from './planners.schema';

@Injectable()
export class PlannersService {
  constructor(
    @InjectModel(Planner.name) private plannerModel: Model<PlannerDocument>
  ) {}

  async createPlan(plannerDto: Partial<Planner>): Promise<Planner> {
    try {
      const newPlanQuery = new this.plannerModel({
        ...plannerDto,
        userId: new Types.ObjectId(plannerDto.userId),
      });

      const savedPlan = await newPlanQuery.save();
      console.log(newPlanQuery.save());

      const date = new Date(plannerDto.date);
      const repeatDays = plannerDto.repeatDays;
      const repeatWeeks = plannerDto.repeatWeeks;

      if (repeatDays) {
        for (const day of repeatDays) {
          for (let i: number = 0; i < repeatWeeks; i++) {
            const selectedDay = this.mappingDays[day];
            const today = new Date().getDay();

            if (
              today != selectedDay &&
              (selectedDay == 0 || today < selectedDay)
            ) {
              const planId: Types.ObjectId = savedPlan._id as Types.ObjectId;
              const dateOffset = ((selectedDay - today + 7) % 7) + i * 7;

              const selectedDate = new Date();
              selectedDate.setDate(date.getDate() + dateOffset + 1);
              const planDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

              await this.createPlanCascade(planId, planDate, plannerDto);
            }
          }
        }
      }

      return savedPlan;
    } catch (error) {
      console.log(error);
    }
  }

  private readonly mappingDays: { [key: string]: number } = {
    일: 0,
    월: 1,
    화: 2,
    수: 3,
    목: 4,
    금: 5,
    토: 6,
  };

  private async createPlanCascade(
    parentId: Types.ObjectId,
    plannerDate: string,
    plannerDto: Partial<Planner>
  ): Promise<Planner> {
    const newChildPlanQuery = new this.plannerModel({
      ...plannerDto,
      date: plannerDate,
      userId: new Types.ObjectId(plannerDto.userId),
      parentObjectId: new Types.ObjectId(parentId),
    });

    return await newChildPlanQuery.save();
  }

  async showAll(date: string): Promise<Planner[]> {
    const planners = await this.plannerModel
      .aggregate([
        { $match: { date: date } },
        {
          $addFields: {
            sortField: {
              $cond: {
                if: {
                  $or: [
                    { $not: ['$startTime'] },
                    { $eq: ['$startTime', null] },
                    { $eq: ['$startTime', ''] },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
          },
        },
        {
          $sort: {
            sortField: 1, // 빈 값이 있는 경우 마지막에 오도록 정렬
            startTime: 1,
          },
        },
        {
          $project: {
            sortField: 0, // sortField 필드를 결과에서 제거
          },
        },
      ])
      .exec();
    return planners;
  }

  // async findOne(plannerId: Types.ObjectId): Promise<Planner> {
  //   return this.plannerModel.findById(plannerId).exec();
  // }

  async updatePlan(
    plannerId: Types.ObjectId,
    plannerDto: Partial<Planner>
  ): Promise<Planner> {
    const updatePlanQuery = await this.plannerModel
      .findByIdAndUpdate(plannerId, plannerDto, {
        new: true,
      })
      .exec();

    return updatePlanQuery;
  }

  private async selectPlan(
    parentId: Types.ObjectId,
    plannerDto: Partial<Planner>
  ): Promise<Planner> {
    const updateCascadePlanQuery = await this.plannerModel
      .findByIdAndUpdate(parentId, plannerDto, {
        new: true,
      })
      .exec();

    return updateCascadePlanQuery;
  }

  async deletePlan(plannerId: Types.ObjectId): Promise<Planner> {
    const deletePlanQuery = await this.plannerModel
      .findByIdAndDelete(new Types.ObjectId(plannerId))
      .exec();

    return deletePlanQuery;
  }

  async toggleIsComplete(plannerId: Types.ObjectId): Promise<Planner> {
    const planner = await this.plannerModel.findById(plannerId);
    if (!planner) {
      throw new NotFoundException(`${plannerId} is not found`);
    }

    planner.isComplete = !planner.isComplete;

    return await planner.save();
  }
}
