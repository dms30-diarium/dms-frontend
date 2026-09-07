import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TooltipComponent } from './tooltip.component';

describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has sensible defaults', () => {
    expect(component.text).toBe('');
    expect(component.class).toBe('opacity-0');
  });

  it('renders the provided text', () => {
    component.text = 'Helpful hint';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Helpful hint');
  });

  it('applies the provided class to the host div', () => {
    component.class = 'opacity-100!';
    fixture.detectChanges();
    const div = fixture.nativeElement.querySelector('div');
    expect(div.classList.contains('opacity-100!')).toBeTrue();
  });
});
