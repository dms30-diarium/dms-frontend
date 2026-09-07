import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragHandleComponent } from './drag-handle.component';

describe('DragHandleComponent', () => {
  let component: DragHandleComponent;
  let fixture: ComponentFixture<DragHandleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DragHandleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DragHandleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a drag handle button', () => {
    const button = fixture.nativeElement.querySelector('button[cdkDragHandle]');
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Flytta sektion');
  });
});
