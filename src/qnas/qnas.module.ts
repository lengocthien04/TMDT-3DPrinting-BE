import { Module } from '@nestjs/common';
import { QnasController } from './qnas.controller';
import { QnasService } from './qnas.service';

@Module({
  controllers: [QnasController],
  providers: [QnasService],
  exports: [QnasService],
})
export class QnasModule {}
