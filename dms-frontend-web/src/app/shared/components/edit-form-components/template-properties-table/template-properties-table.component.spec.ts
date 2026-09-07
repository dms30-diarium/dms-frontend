import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { TemplatePropertiesTableComponent } from './template-properties-table.component';
import { TemplateField } from '@app/shared/api/nuxeo-api.types';

describe('TemplatePropertiesTableComponent', () => {
  let component: TemplatePropertiesTableComponent;
  let fixture: ComponentFixture<TemplatePropertiesTableComponent>;
  let fieldsSignal: ReturnType<typeof signal<TemplateField[]>>;

  beforeEach(async () => {
    fieldsSignal = signal<TemplateField[]>([]);

    await TestBed.configureTestingModule({
      imports: [TemplatePropertiesTableComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(TemplatePropertiesTableComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(TemplatePropertiesTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tableFields', fieldsSignal);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('isDialogOpen defaults false', () => {
      expect(component.isDialogOpen()).toBeFalse();
    });

    it('editingIndex defaults null', () => {
      expect(component.editingIndex()).toBeNull();
    });
  });

  describe('rows computed', () => {
    it('maps entries with __index', () => {
      fieldsSignal.set([
        { nyckel: 'a', varde: '1' },
        { nyckel: 'b', varde: '2' },
      ]);
      expect(component.rows().length).toBe(2);
      expect(component.rows()[1].__index).toBe(1);
    });

    it('returns empty for empty fields', () => {
      expect(component.rows()).toEqual([]);
    });
  });

  describe('openDialog', () => {
    it('opens with empty drafts for new entry', () => {
      component.openDialog();
      expect(component.isDialogOpen()).toBeTrue();
      expect(component.draftNyckel()).toBe('');
      expect(component.editingIndex()).toBeNull();
    });

    it('prefills drafts for existing entry', () => {
      component.openDialog({ nyckel: 'k1', varde: 'v1', __index: 2 });
      expect(component.draftNyckel()).toBe('k1');
      expect(component.draftVarde()).toBe('v1');
      expect(component.editingIndex()).toBe(2);
    });
  });

  describe('setDraftNyckel / setDraftVarde', () => {
    it('sets nyckel as string', () => {
      component.setDraftNyckel(123);
      expect(component.draftNyckel()).toBe('123');
    });

    it('sets varde as string', () => {
      component.setDraftVarde(456);
      expect(component.draftVarde()).toBe('456');
    });
  });

  describe('saveField', () => {
    it('does nothing when nyckel is empty', () => {
      component.draftNyckel.set('');
      component.saveField();
      expect(fieldsSignal()).toEqual([]);
    });

    it('adds new entry when editingIndex is null', () => {
      component.draftNyckel.set('newKey');
      component.draftVarde.set('newVal');
      component.saveField();
      expect(fieldsSignal()).toEqual([{ nyckel: 'newKey', varde: 'newVal' }]);
    });

    it('edits existing entry by index', () => {
      fieldsSignal.set([{ nyckel: 'old', varde: 'oldVal' }]);
      component.openDialog({ nyckel: 'old', varde: 'oldVal', __index: 0 });
      component.draftNyckel.set('updated');
      component.draftVarde.set('updatedVal');
      component.saveField();
      expect(fieldsSignal()).toEqual([{ nyckel: 'updated', varde: 'updatedVal' }]);
    });

    it('closes dialog after save', () => {
      component.isDialogOpen.set(true);
      component.draftNyckel.set('k');
      component.saveField();
      expect(component.isDialogOpen()).toBeFalse();
    });
  });

  describe('removeField', () => {
    it('removes entry by __index', () => {
      fieldsSignal.set([
        { nyckel: 'a', varde: '1' },
        { nyckel: 'b', varde: '2' },
      ]);
      component.removeField({ nyckel: 'a', varde: '1', __index: 0 });
      expect(fieldsSignal()).toEqual([{ nyckel: 'b', varde: '2' }]);
    });
  });

  describe('closeDialog', () => {
    it('resets drafts and editingIndex', () => {
      component.draftNyckel.set('x');
      component.editingIndex.set(3);
      component.isDialogOpen.set(true);
      component.closeDialog();
      expect(component.isDialogOpen()).toBeFalse();
      expect(component.editingIndex()).toBeNull();
      expect(component.draftNyckel()).toBe('');
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns 2 options', () => {
      expect(component.getDefaultColumnOptions().length).toBe(2);
    });
  });
});
