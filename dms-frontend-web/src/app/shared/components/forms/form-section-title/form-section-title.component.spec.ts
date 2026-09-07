import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormSectionTitleComponent } from './form-section-title.component';

describe('FormSectionTitleComponent', () => {
  let component: FormSectionTitleComponent;
  let fixture: ComponentFixture<FormSectionTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormSectionTitleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormSectionTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('title defaults to an empty string', () => {
    expect(component.title()).toBe('');
  });

  it('renders the provided title text', () => {
    fixture.componentRef.setInput('title', 'Section Title');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h3').textContent.trim()).toBe('Section Title');
  });
});
