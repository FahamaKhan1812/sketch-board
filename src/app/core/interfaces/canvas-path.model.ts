export interface PathPoint {
  x: number;
  y: number;
}

export interface PathData {
  id: string;
  color: string;
  size: number;
  points: PathPoint[];
}
