import { Module } from '@nestjs/common';
import { PrintFilesController } from './print-files.controller';
import { PrintFilesService } from './print-files.service';

@Module({
  controllers: [PrintFilesController],
  providers: [PrintFilesService],
  exports: [PrintFilesService],
})
export class PrintFilesModule {}
