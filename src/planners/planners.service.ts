import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Planner } from './planners.schema';

@Injectable()
export class PlannersService {
  constructor(
    @InjectModel(Planner.name) private plannerModel: Model<Planner>
  ) {}

  async createPlan(
    userId: string,
    plannerDto: Partial<Planner>
  ): Promise<Planner> {
    try {
      let createDataNum = 1;
      const newPlanQuery = new this.plannerModel({
        ...plannerDto,
        userId: new Types.ObjectId(userId),
      });
      console.log('root 데이터 생성 성공');

      const savedPlan = await newPlanQuery.save();
      console.log(newPlanQuery.save());

      const date = new Date(plannerDto.date);
      const repeatDays = plannerDto.repeatDays;
      const repeatWeeks = plannerDto.repeatWeeks;

      if (repeatDays) {
        console.log('반복 요일이 존재합니다');
        console.log(`${repeatWeeks}주간 반복`);
        for (const day of repeatDays) {
          for (let i: number = 0; i < repeatWeeks; i++) {
            const selectedDay = this.mappingDays[day];
            const today = new Date();
            const todayDate = today.getDay();
            const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            const planId: Types.ObjectId = savedPlan._id as Types.ObjectId;
            const dateOffset = ((selectedDay - todayDate + 7) % 7) + i * 7;

            const selectedDate = new Date();
            selectedDate.setDate(date.getDate() + dateOffset);
            const planDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

            if (todayString < planDate) {
              createDataNum += 1;
              console.log(
                `데이터 생성, 할 일 날짜: ${planDate}, 오늘: ${todayString}`
              );
              await this.createPlanCascade(
                userId,
                planId,
                planDate,
                plannerDto
              );
            }
          }
        }
      }

      console.log(`${createDataNum} 개의 데이터가 생성되었습니다.`);
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
    userId: string,
    parentId: Types.ObjectId,
    plannerDate: string,
    plannerDto: Partial<Planner>
  ): Promise<Planner> {
    const newChildPlanQuery = new this.plannerModel({
      ...plannerDto,
      date: plannerDate,
      userId: new Types.ObjectId(userId),
      parentObjectId: new Types.ObjectId(parentId),
    });

    return await newChildPlanQuery.save();
  }

  async showAll(userId: string, date: string): Promise<Planner[]> {
    const planners = await this.plannerModel
      .aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
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

    console.log('데이터 조회');
    return planners;
  }

  async updatePlan(
    userId: string,
    plannerId: string,
    plannerDto: Partial<Planner>
  ): Promise<any> {
    const { date, parentObjectId, ...updatePlannerDto } = plannerDto;
    let rootId: Types.ObjectId = new Types.ObjectId(plannerId);

    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (parentObjectId) {
      rootId = new Types.ObjectId(parentObjectId);
      console.log(rootId);
    }

    // 할 일의 날짜가 오늘
    if (todayString == date) {
      console.log('업데이트...');
      await this.plannerModel
        .findByIdAndUpdate(
          rootId,
          { ...plannerDto, userId: new Types.ObjectId(userId) },
          { new: true }
        )
        .exec();
    }

    // 오늘 이후 날짜의 데이터 삭제
    console.log(todayString);
    await this.deletePlanCascade(rootId, todayString);

    // 오늘 이후 날짜의 데이터 재생성
    const rootData = await this.plannerModel.findById(rootId).exec();
    const rootDate = new Date(rootData.date);

    const repeatDays = updatePlannerDto.repeatDays;
    const repeatWeeks = updatePlannerDto.repeatWeeks;
    let recreateDataNum: number = 0;

    if (repeatDays) {
      console.log(`${repeatDays}요일 ${repeatWeeks}주간 반복`);
      for (const day of repeatDays) {
        for (let i: number = 0; i < repeatWeeks; i++) {
          const selectedDay = this.mappingDays[day];
          const rootDateNum = rootDate.getDay();

          const planId: Types.ObjectId = rootData._id as Types.ObjectId;
          const dateOffset = ((selectedDay - rootDateNum + 7) % 7) + i * 7;

          const selectedDate = new Date();
          selectedDate.setDate(rootDate.getDate() + dateOffset);
          const planDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

          if (todayString < planDate) {
            console.log(`오늘 ${todayString} , 할 일 날짜 ${planDate}`);
            recreateDataNum += 1;
            await this.createPlanCascade(
              userId,
              planId,
              planDate,
              updatePlannerDto
            );
          }
        }
      }
    }
    console.log(`${recreateDataNum} 개의 데이터가 재생성되었습니다.`);
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

  private async deletePlanCascade(
    parentId: Types.ObjectId,
    todayString: string
  ): Promise<any> {
    const deleteCascadePlanQuery = await this.plannerModel.deleteMany({
      parentObjectId: new Types.ObjectId(parentId),
      date: { $gt: todayString },
    });

    console.log(
      `${deleteCascadePlanQuery.deletedCount} 개의 데이터가 삭제되었습니다.`
    );
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
