import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ExternReferensComponent, ExternalRefOption } from './extern-referens.component';

describe('ExternReferensComponent', () => {
  let component: ExternReferensComponent;
  let fixture: ComponentFixture<ExternReferensComponent>;
  let refsSignal: ReturnType<typeof signal<ExternalRefOption[]>>;

  beforeEach(async () => {
    refsSignal = signal<ExternalRefOption[]>([]);

    await TestBed.configureTestingModule({
      imports: [ExternReferensComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(ExternReferensComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ExternReferensComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tableFields', refsSignal);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isContactDialogOpen', () => {
    it('defaults false', () => {
      expect(component.isContactDialogOpen()).toBeFalse();
    });
  });

  describe('CUSTOM_COLS', () => {
    it('has 2 columns with CUSTOM tableName', () => {
      expect(component.CUSTOM_COLS.length).toBe(2);
      expect(component.CUSTOM_COLS.every(c => c.tableName === 'CUSTOM')).toBeTrue();
    });
  });

  describe('addContact', () => {
    it('adds entry from form values', () => {
      component.form.setValue({ referens: 'Ref1', comment: 'Comment1' });
      component.addContact();
      expect(refsSignal()).toEqual([{ referens: 'Ref1', comment: 'Comment1' }]);
    });

    it('emits saveReferences', () => {
      const spy = jasmine.createSpy('save');
      component.saveReferences.subscribe(spy);
      component.form.setValue({ referens: 'Ref1', comment: '' });
      component.addContact();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('removeContact', () => {
    it('removes matching item by referens', () => {
      refsSignal.set([
        { referens: 'Ref1', comment: 'C1' },
        { referens: 'Ref2', comment: 'C2' },
      ]);
      component.removeContact({ referens: 'Ref1' });
      expect(refsSignal()).toEqual([{ referens: 'Ref2', comment: 'C2' }]);
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns 2 options', () => {
      expect(component.getDefaultColumnOptions().length).toBe(2);
    });

    it('all visible', () => {
      expect(component.getDefaultColumnOptions().every(o => o.visible)).toBeTrue();
    });
  });
});
