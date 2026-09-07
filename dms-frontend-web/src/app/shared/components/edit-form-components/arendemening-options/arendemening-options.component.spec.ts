import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ArendemeningOptionsComponent } from './arendemening-options.component';

interface ArendemeningRow {
  arendemening: string;
}

describe('ArendemeningOptionsComponent', () => {
  let component: ArendemeningOptionsComponent;
  let fixture: ComponentFixture<ArendemeningOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArendemeningOptionsComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(ArendemeningOptionsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ArendemeningOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signals initial state', () => {
    it('isContactDialogOpen defaults to false', () => {
      expect(component.isContactDialogOpen()).toBeFalse();
    });

    it('values defaults to empty array', () => {
      expect(component.values()).toEqual([]);
    });

    it('heading defaults to empty string', () => {
      expect(component.heading()).toBe('');
    });
  });

  describe('ngOnInit', () => {
    it('sets values from defaultValue input', () => {
      fixture.componentRef.setInput('defaultValue', ['Arende mening 1', 'Arende mening 2']);
      component.ngOnInit();
      expect(component.values().length).toBe(2);
      expect((component.values()[0] as ArendemeningRow).arendemening).toBe('Arende mening 1');
    });

    it('leaves values empty when defaultValue is undefined', () => {
      component.ngOnInit();
      expect(component.values()).toEqual([]);
    });
  });

  describe('addContact', () => {
    it('returns false when form is invalid (empty)', () => {
      const result = component.addContact();
      expect(result).toBeFalse();
    });

    it('adds value when form is valid', () => {
      component.form.controls.arendemening.setValue('This is a valid arendemening text');
      const result = component.addContact();
      expect(result).toBeTrue();
      expect(component.values().length).toBe(1);
    });

    it('resets form after adding', () => {
      component.form.controls.arendemening.setValue('Valid arendemening text value');
      component.addContact();
      expect(component.form.value.arendemening).toBe('');
    });

    it('marks control dirty when invalid', () => {
      component.addContact();
      expect(component.form.controls.arendemening.dirty).toBeTrue();
    });
  });

  describe('removeContact', () => {
    it('removes item by id', () => {
      component.form.controls.arendemening.setValue('Valid mening text here');
      component.addContact();
      expect(component.values().length).toBe(1);
      component.removeContact({ id: 'Valid mening text here', label: 'Valid mening text here' });
      expect(component.values().length).toBe(0);
    });
  });

  describe('saveContact', () => {
    it('closes dialog when form valid', () => {
      component.isContactDialogOpen.set(true);
      component.form.controls.arendemening.setValue('Valid arendemening text saved');
      component.saveContact();
      expect(component.isContactDialogOpen()).toBeFalse();
    });

    it('does not close dialog when form invalid', () => {
      component.isContactDialogOpen.set(true);
      component.saveContact();
      expect(component.isContactDialogOpen()).toBeTrue();
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns 1 column option', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.length).toBe(1);
    });

    it('column has key arendemening', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts[0].id).toBe('arendemening');
    });
  });
});
