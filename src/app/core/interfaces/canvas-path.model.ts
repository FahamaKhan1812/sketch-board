// canvas-path.model.ts

export interface Point {
  x: number;
  y: number;
}

export interface PathData {
  id: string;
  color: string;
  size: number;
  points: Point[];
}

export interface RectangleData {
  id: string;
  color: string;
  size: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleData {
  id: string;
  color: string;
  size: number;
  x: number; // center X
  y: number; // center Y
  radius: number;
}

export interface LineData {
  id: string;
  color: string;
  size: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type DrawingTool = 'pen' | 'rectangle' | 'circle' | 'line' | 'arrow';

export interface CanvasDrawingData {
  paths: PathData[];
  rectangles: RectangleData[];
  canvasSize: {
    width: number;
    height: number;
  };
}

export interface BrushSettings {
  color: string;
  size: number;
}

export interface DrawingState {
  isDrawing: boolean;
  currentTool: DrawingTool;
  brushSettings: BrushSettings;
}

export interface ArrowData {
  id: string;
  color: string;
  size: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}