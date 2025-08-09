import {
  AfterViewInit,
  Component,
  DestroyRef,
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

import { PathData } from '../../core/interfaces/canvas-path.model';

@Component({
  selector: 'app-canvas-shell',
  templateUrl: './canvas-shell.component.html',
  styleUrl: './canvas-shell.component.scss',
})
export class CanvasShellComponent implements AfterViewInit {
  @ViewChild('myCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

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
  private currentPath: PathData | null = null;
  private ctx!: CanvasRenderingContext2D;
  private brushEffectRef?: EffectRef;
  private injector = inject(Injector);

  // Computed signal for brush style display
  currentBrushStyle = computed(() => ({
    color: this.brushColor(),
    width: this.brushWidth(),
    preview: `${this.brushWidth()}px ${this.brushColor()} brush`,
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
    const prevCurrent = this.currentPath ? { ...this.currentPath } : null;

    this.setupCanvas();
    this.redrawAllPaths();

    this.paths = prevPaths;
    this.currentPath = prevCurrent;
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

    // Recreate effect in DI context
    this.brushEffectRef?.destroy();
    runInInjectionContext(this.injector, () => {
      this.brushEffectRef = effect(() => {
        if (!this.ctx) return;
        this.ctx.strokeStyle = this.brushColor();
        this.ctx.lineWidth = this.brushWidth();
      });
    });
  }

  private drawBoardFrame(width: number, height: number) {
    // Clear the canvas first
    this.ctx.clearRect(0, 0, width, height);

    // Fill background
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, width, height);

    // Draw border (removed to avoid visible border)
    // this.ctx.strokeStyle = 'white';
    // this.ctx.lineWidth = 1;
    // this.ctx.strokeRect(0, 0, width, height);

    // Reset stroke style for drawing from signals
    this.ctx.strokeStyle = this.brushColor();
    this.ctx.lineWidth = this.brushWidth();
  }

  private redrawAllPaths() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawPath = (path: PathData) => {
      if (path.points.length < 2) return;
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
    };

    for (const path of this.paths) drawPath(path);
    if (this.currentPath) drawPath(this.currentPath); // show live stroke
  }

  onMouseDown(event: MouseEvent) {
    const { offsetX, offsetY } = event;
    this.isDrawing.set(true);
    this.currentPath = {
      id: crypto.randomUUID(),
      color: this.brushColor(),
      size: this.brushWidth(),
      points: [{ x: offsetX, y: offsetY }],
    };
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDrawing() || !this.currentPath) return;
    const { offsetX, offsetY } = event;
    this.currentPath.points.push({ x: offsetX, y: offsetY });
    this.redrawAllPaths();
  }

  onMouseUp() {
    if (this.currentPath) {
      this.paths.push(this.currentPath);
      this.currentPath = null;
    }
    this.isDrawing.set(false);
  }

  // Updated methods to use signals
  clearCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    this.drawBoardFrame(parent.clientWidth, parent.clientHeight);
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

  // Additional utility methods for signals
  getCurrentBrushInfo() {
    return this.currentBrushStyle();
  }

  getCanvasInfo() {
    return {
      size: this.canvasSize(),
      isDrawing: this.isDrawing(),
      brush: this.currentBrushStyle(),
    };
  }
} 

/*
 private captureEvents(canvasEl: HTMLCanvasElement) {
    // helper to get point relative to canvas and accounting for CSS position
    const getPointFromMouse = (ev: MouseEvent | Touch, rect: DOMRect) => ({
      x: (ev as MouseEvent).clientX - rect.left,
      y: (ev as MouseEvent).clientY - rect.top,
    });

    // state for smoothing
    let lastPoint: { x: number; y: number } | null = null;
    let lastMidPoint: { x: number; y: number } | null = null;
    let rafId: number | null = null;
    let queuedPoint: { x: number; y: number } | null = null;

    const drawSegment = (pt: { x: number; y: number }) => {
      if (!this.ctx || !lastPoint) {
        return;
      }

      // compute midpoint between lastPoint and current pt
      const midPoint = {
        x: (lastPoint.x + pt.x) / 2,
        y: (lastPoint.y + pt.y) / 2,
      };

      // if we have a previous midpoint, start the quadratic curve from that
      // otherwise start from lastPoint (first stroke)
      this.ctx.beginPath();
      // Move to last midpoint if exists to connect smoothly, otherwise moveTo lastPoint
      if (lastMidPoint) {
        this.ctx.moveTo(lastMidPoint.x, lastMidPoint.y);
      } else {
        this.ctx.moveTo(lastPoint.x, lastPoint.y);
      }

      // Quadratic curve using lastPoint as control and midPoint as destination
      this.ctx.quadraticCurveTo(
        lastPoint.x,
        lastPoint.y,
        midPoint.x,
        midPoint.y
      );
      this.ctx.stroke();

      // update history
      lastMidPoint = midPoint;
      lastPoint = pt;
    };

    // use RAF to batch points
    const scheduleDraw = (pt: { x: number; y: number }) => {
      queuedPoint = pt;
      if (rafId == null) {
        rafId = requestAnimationFrame(() => {
          if (queuedPoint) drawSegment(queuedPoint);
          queuedPoint = null;
          rafId = null;
        });
      }
    };

    // MOUSE
    fromEvent<MouseEvent>(canvasEl, 'mousedown')
      .pipe(
        switchMap((startEvent) => {
          this.isDrawing.set(true);
          const rect = canvasEl.getBoundingClientRect();
          lastPoint = getPointFromMouse(startEvent, rect);
          lastMidPoint = null;

          // apply brush settings on stroke start (effect ensures ctx updated, but safe to reapply)
          this.ctx.beginPath();
          this.ctx.moveTo(lastPoint.x, lastPoint.y);

          return fromEvent<MouseEvent>(canvasEl, 'mousemove').pipe(
            takeUntil(fromEvent(canvasEl, 'mouseup')),
            takeUntil(fromEvent(canvasEl, 'mouseleave'))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (moveEvent) => {
          const rect = canvasEl.getBoundingClientRect();
          const pt = getPointFromMouse(moveEvent, rect);
          scheduleDraw(pt);
        },
        complete: () => {
          // complete handler -> stroke finished
          this.isDrawing.set(false);
          lastPoint = null;
          lastMidPoint = null;
          if (rafId != null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        },
      });

    // TOUCH
    fromEvent<TouchEvent>(canvasEl, 'touchstart')
      .pipe(
        switchMap((startEvent) => {
          startEvent.preventDefault();
          this.isDrawing.set(true);

          const rect = canvasEl.getBoundingClientRect();
          const t = startEvent.touches[0];
          lastPoint = getPointFromMouse(t, rect);
          lastMidPoint = null;

          this.ctx.beginPath();
          this.ctx.moveTo(lastPoint.x, lastPoint.y);

          return fromEvent<TouchEvent>(canvasEl, 'touchmove').pipe(
            takeUntil(fromEvent(canvasEl, 'touchend')),
            takeUntil(fromEvent(canvasEl, 'touchcancel'))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (moveEvent) => {
          moveEvent.preventDefault();
          const rect = canvasEl.getBoundingClientRect();
          const t = (moveEvent as TouchEvent).touches[0];
          const pt = getPointFromMouse(t, rect);
          scheduleDraw(pt);
        },
        complete: () => {
          this.isDrawing.set(false);
          lastPoint = null;
          lastMidPoint = null;
          if (rafId != null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        },
      });
  }

  private drawOnCanvas(currentPos: { x: number; y: number }) {
    if (!this.ctx) {
      return;
    }

    // Draw line to current position
    this.ctx.lineTo(currentPos.x, currentPos.y);
    this.ctx.stroke();
  }
*/