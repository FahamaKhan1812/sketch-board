import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasShellComponent } from './canvas-shell.component';

describe('CanvasShellComponent', () => {
  let component: CanvasShellComponent;
  let fixture: ComponentFixture<CanvasShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasShellComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CanvasShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
