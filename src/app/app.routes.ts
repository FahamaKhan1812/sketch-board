import { Routes } from '@angular/router';
import { CanvasShellComponent } from './pages/canvas-shell/canvas-shell.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/canvas-shell/canvas-shell.component').then(
        (m) => m.CanvasShellComponent
      ),
  },
];
