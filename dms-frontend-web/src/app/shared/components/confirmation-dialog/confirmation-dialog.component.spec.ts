import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent],
    })
      .overrideTemplate(ConfirmationDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('text', 'Are you sure?');
    fixture.componentRef.setInput('label', 'Confirm');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the provided text and label', () => {
    expect(component.text()).toBe('Are you sure?');
    expect(component.label()).toBe('Confirm');
  });

  it('emits confirm', () => {
    const spy = jasmine.createSpy('confirm');
    component.confirm.subscribe(spy);
    component.confirm.emit();
    expect(spy).toHaveBeenCalled();
  });

  it('emits canceled', () => {
    const spy = jasmine.createSpy('canceled');
    component.canceled.subscribe(spy);
    component.canceled.emit();
    expect(spy).toHaveBeenCalled();
  });
});
