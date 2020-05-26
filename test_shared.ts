export class Point {
  constructor(public x: number, public y: number) {}
  action(...args: any[]): any {
    return args[0];
  }
  toString(): string {
    return [this.x, this.y].join(", ");
  }
  *[Symbol.iterator](): IterableIterator<number> {
    yield this.x;
    yield this.y;
  }
}

export function stringifyPoint(point: Point) {
  return point.toString();
}
