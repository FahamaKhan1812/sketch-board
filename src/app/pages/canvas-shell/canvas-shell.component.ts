import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
} from '@angular/core';
@Component({
  selector: 'app-canvas-shell',

  templateUrl: './canvas-shell.component.html',
  styleUrl: './canvas-shell.component.scss',
})
export class CanvasShellComponent implements AfterViewInit {
  @ViewChild('myCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;

  ngAfterViewInit() {
    this.setupCanvas();
  }

  @HostListener('window:resize')
  onResize() {
    this.setupCanvas();
  }

  private setupCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;

    // High-DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;

    canvas.style.width = `${parent.clientWidth}px`;
    canvas.style.height = `${parent.clientHeight}px`;

    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);

    // Just for visual confirmation
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, parent.clientWidth, parent.clientHeight);
    this.ctx.strokeStyle = 'red';
    this.ctx.strokeRect(0, 0, parent.clientWidth, parent.clientHeight);
  }
}
