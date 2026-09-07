import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccordionCopyComponent } from './accordion-copy.component';

describe('AccordionCopyComponent', () => {
  let component: AccordionCopyComponent;
  let fixture: ComponentFixture<AccordionCopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccordionCopyComponent],
    })
      .overrideTemplate(AccordionCopyComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(AccordionCopyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls formChange when the form value changes', () => {
      const spy = jasmine.createSpy('formChange');
      fixture.componentRef.setInput('formChange', spy);
      fixture.detectChanges();

      component.form.patchValue({ ccRecipients: 'a@b.com' });

      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ ccRecipients: 'a@b.com' }));
    });

    it('does not throw when no formChange callback is provided', () => {
      fixture.detectChanges();
      expect(() => component.form.patchValue({ ccRecipients: 'a@b.com' })).not.toThrow();
    });
  });

  describe('changeForm', () => {
    it('invokes the formChange callback with the given event', () => {
      const spy = jasmine.createSpy('formChange');
      fixture.componentRef.setInput('formChange', spy);
      fixture.detectChanges();
      spy.calls.reset();

      component.changeForm({ ccRecipients: 'x@y.com' });

      expect(spy).toHaveBeenCalledWith({ ccRecipients: 'x@y.com' });
    });
  });
});
