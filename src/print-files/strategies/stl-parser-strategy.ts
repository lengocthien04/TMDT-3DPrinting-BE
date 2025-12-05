import { IFileParserStrategy } from './file-parser-strategy.interface';
import NodeStl from 'node-stl';

export class StlParserStrategy implements IFileParserStrategy {
  calculateDimensions(filePath: string) {
    const { volume, boundingBox } = new NodeStl(filePath);

    return {
      volume: volume * 1000,
      height: boundingBox[2],
      width: boundingBox[0],
      depth: boundingBox[1],
    };
  }
}
