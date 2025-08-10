import {
  AfterViewInit,
  Component,
  EffectRef,
  ElementRef,
  HostListener,
  Injector,
  ViewChild,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';

import {
  CircleData,
  DrawingTool,
  LineData,
  PathData,
  RectangleData,
} from '../../core/interfaces/canvas-path.model';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-canvas-shell',
  templateUrl: './canvas-shell.component.html',
  styleUrl: './canvas-shell.component.scss',
  imports: [TitleCasePipe],
})
export class CanvasShellComponent implements AfterViewInit {
  @ViewChild('myCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  // Drawing tool selection
  selectedTool = signal<DrawingTool>('pen');

  // Brush settings as signals
  brushColor = signal<string>('#000000');
  brushWidth = signal<number>(2);

  // Canvas state signals
  isDrawing = signal<boolean>(false);
  canvasSize = signal<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  private paths: PathData[] = [];

  private rectangles: RectangleData[] = [];
  private currentPath: PathData | null = null;
  private currentRectangle: RectangleData | null = null;
  private rectangleStartPoint: { x: number; y: number } | null = null;

  private circles: CircleData[] = [];
  private currentCircle: CircleData | null = null;
  private circleStartPoint: { x: number; y: number } | null = null;

  private lines: LineData[] = [];
  private currentLine: LineData | null = null;
  private lineStartPoint: { x: number; y: number } | null = null;
  private isShiftPressed = false;

  private arrows: LineData[] = [];

  private currentArrow: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null = null;
  private arrowStartPoint: { x: number; y: number } | null = null;

  private ctx!: CanvasRenderingContext2D;
  private brushEffectRef?: EffectRef;
  private injector = inject(Injector);

  // Computed signal for brush style display
  currentBrushStyle = computed(() => ({
    color: this.brushColor(),
    width: this.brushWidth(),
    preview: `${this.brushWidth()}px ${this.brushColor()} brush`,
  }));

  // Computed signal for tool display
  toolInfo = computed(() => ({
    tool: this.selectedTool(),
    isShape: this.selectedTool() !== 'pen',
    icon: this.getToolIcon(this.selectedTool()),
  }));

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    // this.captureEvents(canvas);
  }

  @HostListener('window:resize')
  onResize() {
    const prevPaths = [...this.paths];
    const prevRectangles = [...this.rectangles];
    const prevCurrent = this.currentPath ? { ...this.currentPath } : null;

    this.setupCanvas();
    this.redrawAll();

    this.paths = prevPaths;
    this.rectangles = prevRectangles;
    this.currentPath = prevCurrent;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Shift') {
      this.isShiftPressed = true;
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Shift') {
      this.isShiftPressed = false;
    }
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);

    // Set canvas properties
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Recreate effect in DI context
    this.brushEffectRef?.destroy();
    runInInjectionContext(this.injector, () => {
      this.brushEffectRef = effect(() => {
        if (!this.ctx) return;
        this.ctx.strokeStyle = this.brushColor();
        this.ctx.lineWidth = this.brushWidth();
      });
    });

    // Draw initial background
    this.drawBackground();
  }

  private drawBackground() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.save();
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.ctx.restore();
  }

  private redrawAll() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawBackground();

    // Draw all completed paths
    this.paths.forEach((path) => this.drawPath(path));

    // Draw all completed rectangles
    this.rectangles.forEach((rect) => this.drawRectangle(rect));

    // Draw all completed circles
    this.circles.forEach((circle) => this.drawCircle(circle));

    // Draw all completed lines
    this.lines.forEach((line) => this.drawLine(line));

    // Draw all completed arrows with their stored properties
    this.arrows.forEach((arrow) =>
      this.drawArrow(
        arrow.x1,
        arrow.y1,
        arrow.x2,
        arrow.y2,
        arrow.color,
        arrow.size
      )
    );

    // Draw current path if drawing
    if (this.currentPath) {
      this.drawPath(this.currentPath);
    }

    // Draw current rectangle if drawing
    if (this.currentRectangle) {
      this.drawRectangle(this.currentRectangle, true);
    }

    // Draw current circle if drawing
    if (this.currentCircle) {
      this.drawCircle(this.currentCircle, true);
    }

    // Draw current line if drawing
    if (this.currentLine) {
      this.drawLine(this.currentLine, true);
    }

    // Draw current arrow if drawing (preview)
    if (this.currentArrow) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.7;
      this.ctx.setLineDash([5, 5]);
      this.drawArrow(
        this.currentArrow.x1,
        this.currentArrow.y1,
        this.currentArrow.x2,
        this.currentArrow.y2
      );
      this.ctx.restore();
    }
  }
  private drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color?: string,
    size?: number
  ) {
    this.ctx.save();

    // Use provided color/size or current brush settings
    const currentColor = color || this.brushColor();
    const currentSize = size || this.brushWidth();

    this.ctx.strokeStyle = currentColor;
    this.ctx.fillStyle = currentColor;
    this.ctx.lineWidth = currentSize;

    // Calculate arrow head size based on line width
    const headlen = Math.max(8, currentSize * 4); // Minimum 8px, scales with line width
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Shorten the line so it doesn't go through the arrow head
    const shortenBy = headlen * 0.3;
    const lineEndX = x2 - shortenBy * Math.cos(angle);
    const lineEndY = y2 - shortenBy * Math.sin(angle);

    // Draw the main line
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(lineEndX, lineEndY);
    this.ctx.stroke();

    // Draw arrow head as a filled triangle
    const arrowAngle = Math.PI / 6; // 30 degrees

    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2); // Arrow tip

    // Left side of arrow head
    this.ctx.lineTo(
      x2 - headlen * Math.cos(angle - arrowAngle),
      y2 - headlen * Math.sin(angle - arrowAngle)
    );

    // Right side of arrow head
    this.ctx.lineTo(
      x2 - headlen * Math.cos(angle + arrowAngle),
      y2 - headlen * Math.sin(angle + arrowAngle)
    );

    // Close the triangle
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }
  private drawPath(path: PathData) {
    if (!path.points || path.points.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = path.color;
    this.ctx.lineWidth = path.size;
    this.ctx.beginPath();

    let p1 = path.points[0];
    let p2 = path.points[1];
    this.ctx.moveTo(p1.x, p1.y);

    for (let i = 1; i < path.points.length; i++) {
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      this.ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
      p1 = path.points[i];
      p2 = path.points[i + 1] || path.points[i];
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawRectangle(rect: RectangleData, isPreview: boolean = false) {
    this.ctx.save();
    this.ctx.strokeStyle = rect.color;
    this.ctx.lineWidth = rect.size;

    if (isPreview) {
      // Make preview slightly transparent
      this.ctx.globalAlpha = 0.7;
      this.ctx.setLineDash([5, 5]); // Dashed line for preview
    }

    this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    this.ctx.restore();
  }

  private drawCircle(circle: CircleData, isPreview: boolean = false) {
    this.ctx.save();
    this.ctx.strokeStyle = circle.color;
    this.ctx.lineWidth = circle.size;

    if (isPreview) {
      this.ctx.globalAlpha = 0.7;
      this.ctx.setLineDash([5, 5]);
    }

    this.ctx.beginPath();
    this.ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawLine(line: LineData, isPreview: boolean = false) {
    this.ctx.save();
    this.ctx.strokeStyle = line.color;
    this.ctx.lineWidth = line.size;

    if (isPreview) {
      this.ctx.globalAlpha = 0.7;
      this.ctx.setLineDash([5, 5]);
    }

    this.ctx.beginPath();
    this.ctx.moveTo(line.x1, line.y1);
    this.ctx.lineTo(line.x2, line.y2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  // Mouse event handlers
  onMouseDown(event: MouseEvent) {
    const { offsetX, offsetY } = event;
    this.isDrawing.set(true);

    if (this.selectedTool() === 'pen') {
      // Free drawing
      this.currentPath = {
        id: crypto.randomUUID(),
        color: this.brushColor(),
        size: this.brushWidth(),
        points: [{ x: offsetX, y: offsetY }],
      };
    } else if (this.selectedTool() === 'rectangle') {
      // Rectangle drawing
      this.rectangleStartPoint = { x: offsetX, y: offsetY };
      this.currentRectangle = {
        id: crypto.randomUUID(),
        color: this.brushColor(),
        size: this.brushWidth(),
        x: offsetX,
        y: offsetY,
        width: 0,
        height: 0,
      };
    } else if (this.selectedTool() === 'circle') {
      this.circleStartPoint = { x: offsetX, y: offsetY };
      this.currentCircle = {
        id: crypto.randomUUID(),
        color: this.brushColor(),
        size: this.brushWidth(),
        x: offsetX,
        y: offsetY,
        radius: 0,
      };
    } else if (this.selectedTool() === 'line') {
      this.lineStartPoint = { x: offsetX, y: offsetY };
      this.currentLine = {
        id: crypto.randomUUID(),
        color: this.brushColor(),
        size: this.brushWidth(),
        x1: offsetX,
        y1: offsetY,
        x2: offsetX,
        y2: offsetY,
      };
    } else if (this.selectedTool() === 'arrow') {
      this.arrowStartPoint = { x: offsetX, y: offsetY };
      this.currentPath = {
        id: crypto.randomUUID(),
        color: this.brushColor(),
        size: this.brushWidth(),
        points: [
          { x: offsetX, y: offsetY },
          { x: offsetX, y: offsetY },
        ], // Always initialized
      };

      this.currentArrow = {
        x1: offsetX,
        y1: offsetY,
        x2: offsetX,
        y2: offsetY,
      };
    }
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDrawing()) return;

    const { offsetX, offsetY } = event;

    if (this.selectedTool() === 'pen' && this.currentPath) {
      // Free drawing
      this.currentPath.points.push({ x: offsetX, y: offsetY });
      this.redrawAll();
    } else if (
      this.selectedTool() === 'rectangle' &&
      this.currentRectangle &&
      this.rectangleStartPoint
    ) {
      // Rectangle drawing - update dimensions
      const startX = this.rectangleStartPoint.x;
      const startY = this.rectangleStartPoint.y;

      this.currentRectangle.x = Math.min(startX, offsetX);
      this.currentRectangle.y = Math.min(startY, offsetY);
      this.currentRectangle.width = Math.abs(offsetX - startX);
      this.currentRectangle.height = Math.abs(offsetY - startY);

      this.redrawAll();
    } else if (
      this.selectedTool() === 'circle' &&
      this.currentCircle &&
      this.circleStartPoint
    ) {
      const dx = offsetX - this.circleStartPoint.x;
      const dy = offsetY - this.circleStartPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);

      this.currentCircle.x = this.circleStartPoint.x;
      this.currentCircle.y = this.circleStartPoint.y;
      this.currentCircle.radius = radius;

      this.redrawAll();
    } else if (
      this.selectedTool() === 'line' &&
      this.currentLine &&
      this.lineStartPoint
    ) {
      let x2 = offsetX;
      let y2 = offsetY;

      if (this.isShiftPressed) {
        const dx = offsetX - this.lineStartPoint.x;
        const dy = offsetY - this.lineStartPoint.y;
        const angle = Math.atan2(dy, dx);
        const snapAngle = Math.PI / 4; // 45° in radians
        const snappedAngle = Math.round(angle / snapAngle) * snapAngle;

        const length = Math.sqrt(dx * dx + dy * dy);
        x2 = this.lineStartPoint.x + Math.cos(snappedAngle) * length;
        y2 = this.lineStartPoint.y + Math.sin(snappedAngle) * length;
      }

      this.currentLine.x2 = x2;
      this.currentLine.y2 = y2;
      this.redrawAll();
    } else if (
      this.selectedTool() === 'arrow' &&
      this.currentArrow &&
      this.arrowStartPoint
    ) {
      const dx = offsetX - this.arrowStartPoint.x;
      const dy = offsetY - this.arrowStartPoint.y;

      // Determine primary direction
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal movement
        if (dx > 0) {
          // Right
          this.currentArrow.x2 = this.arrowStartPoint.x + Math.abs(dx);
          this.currentArrow.y2 = this.arrowStartPoint.y;
        } else {
          // Left
          this.currentArrow.x2 = this.arrowStartPoint.x - Math.abs(dx);
          this.currentArrow.y2 = this.arrowStartPoint.y;
        }
      } else {
        // Vertical movement
        if (dy > 0) {
          // Down
          this.currentArrow.x2 = this.arrowStartPoint.x;
          this.currentArrow.y2 = this.arrowStartPoint.y + Math.abs(dy);
        } else {
          // Up
          this.currentArrow.x2 = this.arrowStartPoint.x;
          this.currentArrow.y2 = this.arrowStartPoint.y - Math.abs(dy);
        }
      }

      this.redrawAll();
    }
  }

  onMouseUp() {
    if (!this.isDrawing()) return;

    if (this.selectedTool() === 'pen' && this.currentPath) {
      // Complete the path
      this.paths.push(this.currentPath);
      this.currentPath = null;
    } else if (this.selectedTool() === 'rectangle' && this.currentRectangle) {
      // Complete the rectangle (only if it has meaningful dimensions)
      if (this.currentRectangle.width > 5 || this.currentRectangle.height > 5) {
        this.rectangles.push(this.currentRectangle);
      }
      this.currentRectangle = null;
      this.rectangleStartPoint = null;
    } else if (this.selectedTool() === 'circle' && this.currentCircle) {
      if (this.currentCircle.radius > 3) {
        this.circles.push(this.currentCircle);
      }
      this.currentCircle = null;
      this.circleStartPoint = null;
    } else if (this.selectedTool() === 'line' && this.currentLine) {
      if (
        Math.abs(this.currentLine.x1 - this.currentLine.x2) > 2 ||
        Math.abs(this.currentLine.y1 - this.currentLine.y2) > 2
      ) {
        this.lines.push(this.currentLine);
      }
      this.currentLine = null;
      this.lineStartPoint = null;
    } else if (this.selectedTool() === 'arrow' && this.currentArrow) {
      // FIX: Store completed arrow properly in the arrows array
      if (
        Math.abs(this.currentArrow.x1 - this.currentArrow.x2) > 2 ||
        Math.abs(this.currentArrow.y1 - this.currentArrow.y2) > 2
      ) {
        this.arrows.push({
          id: crypto.randomUUID(),
          color: this.brushColor(),
          size: this.brushWidth(),
          x1: this.currentArrow.x1,
          y1: this.currentArrow.y1,
          x2: this.currentArrow.x2,
          y2: this.currentArrow.y2,
        });
      }
      this.currentArrow = null;
      this.arrowStartPoint = null;
    }
    this.isDrawing.set(false);
    this.redrawAll();
  }

  // Tool management
  setTool(tool: DrawingTool) {
    this.selectedTool.set(tool);

    // Cancel any current drawing when switching tools
    if (this.isDrawing()) {
      this.currentPath = null;
      this.currentRectangle = null;
      this.rectangleStartPoint = null;
      this.isDrawing.set(false);
      this.redrawAll();
    }
  }

  private getToolIcon(tool: DrawingTool): string {
    switch (tool) {
      case 'pen':
        return '✏️';
      case 'rectangle':
        return '⬜';
      case 'circle':
        return '⚪';
      case 'line':
        return '📏';
      case 'arrow':
        return '🔼';
      default:
        return '🖊️';
    }
  }

  // Canvas management
  clearCanvas() {
    this.paths = [];
    this.rectangles = [];
    this.circles = [];
    this.lines = [];
    this.arrows = []; // Add this line

    this.currentPath = null;
    this.currentRectangle = null;
    this.rectangleStartPoint = null;
    this.currentCircle = null;
    this.circleStartPoint = null;
    this.currentLine = null;
    this.lineStartPoint = null;
    this.currentArrow = null; // Add this line
    this.arrowStartPoint = null; // Add this line

    this.isDrawing.set(false);
    this.redrawAll();
  }

  // Undo functionality
  undo() {
    // Simple approach: remove the last drawn item from any array that has items
    const itemCounts = {
      paths: this.paths.length,
      rectangles: this.rectangles.length,
      circles: this.circles.length,
      lines: this.lines.length,
      arrows: this.arrows.length,
    };

    // Find the most recently drawn item and remove it
    if (itemCounts.arrows > 0) this.arrows.pop();
    else if (itemCounts.lines > 0) this.lines.pop();
    else if (itemCounts.circles > 0) this.circles.pop();
    else if (itemCounts.rectangles > 0) this.rectangles.pop();
    else if (itemCounts.paths > 0) this.paths.pop();

    this.redrawAll();
  }

  // Signal-based brush settings
  setBrushColor(color: string) {
    this.brushColor.set(color);
  }

  setBrushWidth(width: number) {
    this.brushWidth.set(width);
  }

  setBrushSettings(color: string = '#000', width: number = 2) {
    this.brushColor.set(color);
    this.brushWidth.set(width);
  }

  // Utility methods
  getCurrentBrushInfo() {
    return this.currentBrushStyle();
  }

  getCanvasInfo() {
    return {
      size: this.canvasSize(),
      isDrawing: this.isDrawing(),
      brush: this.currentBrushStyle(),
      tool: this.toolInfo(),
      stats: {
        paths: this.paths.length,
        rectangles: this.rectangles.length,
      },
    };
  }

  // Export functionality
  exportDrawing() {
    return {
      paths: this.paths,
      rectangles: this.rectangles,
      canvasSize: this.canvasSize(),
    };
  }

  // Import functionality
  importDrawing(data: { paths: PathData[]; rectangles: RectangleData[] }) {
    this.paths = data.paths || [];
    this.rectangles = data.rectangles || [];
    this.redrawAll();
  }
}
