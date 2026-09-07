import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MotpartInfoComponent } from './motpart-info.component';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

describe('MotpartInfoComponent', () => {
  let component: MotpartInfoComponent;
  let fixture: ComponentFixture<MotpartInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MotpartInfoComponent],
    })
      .overrideTemplate(MotpartInfoComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(MotpartInfoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('motpartTyp defaults to foretagMyndighet', () => {
    fixture.detectChanges();
    expect(component.motpartTyp()).toBe(NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet);
  });

  describe('ngOnInit', () => {
    it('calls formChange when the form value changes', () => {
      const spy = jasmine.createSpy('formChange');
      fixture.componentRef.setInput('formChange', spy);
      fixture.detectChanges();

      component.form.patchValue({ epost: 'a@b.com' });

      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ epost: 'a@b.com' }));
    });

    it('does not throw when no formChange callback is provided', () => {
      fixture.detectChanges();
      expect(() => component.form.patchValue({ epost: 'a@b.com' })).not.toThrow();
    });
  });

  describe('changeForm', () => {
    it('invokes the formChange callback with the given event', () => {
      const spy = jasmine.createSpy('formChange');
      fixture.componentRef.setInput('formChange', spy);
      fixture.detectChanges();
      spy.calls.reset();

      component.changeForm({ epost: 'x@y.com' });

      expect(spy).toHaveBeenCalledWith({ epost: 'x@y.com' });
    });
  });
});
