export interface IFileParserStrategy {
  calculateDimensions(filePath: string): {
    volume: number;
    height: number;
    width: number;
    depth: number;
  };
}
