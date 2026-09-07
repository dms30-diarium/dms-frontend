import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestChangesDialogComponent } from './request-changes-dialog.component';

describe('RequestChangesDialogComponent', () => {
  let component: RequestChangesDialogComponent;
  let fixture: ComponentFixture<RequestChangesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestChangesDialogComponent],
    })
      .overrideTemplate(RequestChangesDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(RequestChangesDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets the comment control on init', () => {
    expect(component.commentControl.value).toBe('');
  });

  describe('onCancel', () => {
    it('resets the comment control and emits cancelDialog', () => {
      component.commentControl.setValue('draft text');
      const spy = jasmine.createSpy('cancelDialog');
      component.cancelDialog.subscribe(spy);

      component.onCancel();

      expect(component.commentControl.value).toBe('');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onSubmit', () => {
    it('does not emit when the comment is empty', () => {
      const spy = jasmine.createSpy('submitComment');
      component.submitComment.subscribe(spy);

      component.onSubmit();

      expect(spy).not.toHaveBeenCalled();
      expect(component.commentControl.touched).toBeTrue();
    });

    it('does not emit when the comment is only whitespace', () => {
      component.commentControl.setValue('   ');
      const spy = jasmine.createSpy('submitComment');
      component.submitComment.subscribe(spy);

      component.onSubmit();

      expect(spy).not.toHaveBeenCalled();
    });

    it('emits the trimmed comment and resets the control', () => {
      component.commentControl.setValue('  Please fix this  ');
      const spy = jasmine.createSpy('submitComment');
      component.submitComment.subscribe(spy);

      component.onSubmit();

      expect(spy).toHaveBeenCalledWith('Please fix this');
      expect(component.commentControl.value).toBe('');
    });
  });
});
