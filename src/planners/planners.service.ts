import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Planner, PlannerDocument } from './planners.schema';

@Injectable()
export class PlannersService {
  constructor(
    @InjectModel(Planner.name) private plannerModel: Model<PlannerDocument>
  ) {}

  async createPlan(
    userId: string,
    plannerDto: Partial<Planner>
  ): Promise<Planner> {
    try {
      const newPlanQuery = new this.plannerModel({
        ...plannerDto,
        userId: new Types.ObjectId(userId),
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

  async showAll(userId: string, date: string): Promise<Planner[]> {
    const planners = await this.plannerModel
      .aggregate([
        {
          $match: {
            _id: new Types.ObjectId(userId),
            date: date,
          },
        },
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

  async updatePlan(
    userId: string,
    plannerId: string,
    plannerDto: Partial<Planner>
  ): Promise<Planner> {
    const { date, parentObjectId, ...updatePlannerDto } = plannerDto;
    let rootId: Types.ObjectId = new Types.ObjectId(plannerId);

    if (parentObjectId) {
      rootId = parentObjectId;
    }

    const updatePlanQuery = await this.plannerModel
      .findByIdAndUpdate(
        { _id: rootId, userId: new Types.ObjectId(userId) },
        updatePlannerDto,
        {
          new: true,
        }
      )
      .exec();

    const childPlannerId = await this.findAll(rootId);

    if (childPlannerId) {
      for (const id of childPlannerId) {
        await this.updatePlanCascade(id, updatePlannerDto);
      }
    }

    return updatePlanQuery;
  }

  private async updatePlanCascade(
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

  private async findAll(parentId: Types.ObjectId): Promise<any[]> {
    const findAllQuery = await this.plannerModel
      .find({ parentObjectId: new Types.ObjectId(parentId) })
      .exec();

    return findAllQuery.map((planner) => planner._id as Types.ObjectId);
  }

  async deletePlan(userId: string, plannerId: string): Promise<Planner> {
    const deletePlanQuery = await this.plannerModel
      .findByIdAndDelete({
        id_: new Types.ObjectId(plannerId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    return deletePlanQuery;
  }

  private async deletePlanCascade(parentId: Types.ObjectId): Promise<Planner> {
    const updateCascadePlanQuery = await this.plannerModel
      .findByIdAndDelete(parentId)
      .exec();

    return updateCascadePlanQuery;
  }

  async toggleIsComplete(userId: string, plannerId: string): Promise<Planner> {
    const planner = await this.plannerModel.findOne({
      _id: new Types.ObjectId(plannerId),
      userId: new Types.ObjectId(userId),
    });
    if (!planner) {
      throw new NotFoundException(`${plannerId} is not found`);
    }

    planner.isComplete = !planner.isComplete;

    return await planner.save();
  }
}
