import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { S3Service } from '../s3/s3.service';
import { Image, ImageDocument } from '../schemas/image.schema';

@Injectable()
export class ImageService {
  constructor(
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
    private readonly s3Service: S3Service
  ) {}

  async uploadImage(file: Express.Multer.File): Promise<Image> {
    const uploadResult = await this.s3Service.uploadFile(file);
    const newImage = new this.imageModel({
      url: uploadResult.Location,
      filename: file.originalname,
    });

    return newImage.save();
  }
}
