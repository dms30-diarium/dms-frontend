import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BasicMetaDataTableComponent, MetadataDefinitionRow } from './basic-metadata-table.component';

function makeRow(id: string, nyckel: string): MetadataDefinitionRow {
  return { id, nyckel, flervardig: false, aktiv: true, typ: 'String', ordning: 1 };
}

describe('BasicMetaDataTableComponent', () => {
  let component: BasicMetaDataTableComponent;
  let fixture: ComponentFixture<BasicMetaDataTableComponent>;
  let tableSignal: ReturnType<typeof signal<MetadataDefinitionRow[]>>;

  beforeEach(async () => {
    tableSignal = signal<MetadataDefinitionRow[]>([]);

    await TestBed.configureTestingModule({
      imports: [BasicMetaDataTableComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(BasicMetaDataTableComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(BasicMetaDataTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tableFields', tableSignal);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signals initial state', () => {
    it('isDialogOpen defaults to false', () => {
      expect(component.isDialogOpen()).toBeFalse();
    });

    it('editingId defaults to null', () => {
      expect(component.editingId()).toBeNull();
    });

    it('showAddButton defaults to true', () => {
      expect(component.showAddButton()).toBeTrue();
    });

    it('showActions defaults to true', () => {
      expect(component.showActions()).toBeTrue();
    });
  });

  describe('openDialog', () => {
    it('sets isDialogOpen to true', () => {
      component.openDialog();
      expect(component.isDialogOpen()).toBeTrue();
    });

    it('resets editingId to null when no entry provided', () => {
      component.openDialog();
      expect(component.editingId()).toBeNull();
    });

    it('sets editingId when entry provided', () => {
      const entry = makeRow('r-1', 'myKey');
      component.openDialog(entry);
      expect(component.editingId()).toBe('r-1');
    });

    it('resets form with entry values', () => {
      const entry = makeRow('r-1', 'existingKey');
      component.openDialog(entry);
      expect(component.form.value.nyckel).toBe('existingKey');
    });

    it('sets ordning to next index when no entry', () => {
      tableSignal.set([makeRow('r-1', 'k1'), makeRow('r-2', 'k2')]);
      component.openDialog();
      expect(component.form.value.ordning).toBe(3);
    });
  });

  describe('addMetadataField', () => {
    it('does nothing when form invalid (empty nyckel)', () => {
      component.openDialog();
      component.form.controls.nyckel.setValue('');
      component.addMetadataField();
      expect(tableSignal().length).toBe(0);
    });

    it('does nothing when typ is empty', () => {
      component.openDialog();
      component.form.controls.nyckel.setValue('k');
      component.form.controls.typ.setValue('');
      component.addMetadataField();
      expect(tableSignal().length).toBe(0);
    });

    it('adds new row to tableFields', () => {
      component.openDialog();
      component.form.controls.nyckel.setValue('newKey');
      component.form.controls.typ.setValue('String');
      component.addMetadataField();
      expect(tableSignal().length).toBe(1);
      expect(tableSignal()[0].nyckel).toBe('newKey');
    });

    it('closes dialog after adding', () => {
      component.openDialog();
      component.form.controls.nyckel.setValue('k');
      component.form.controls.typ.setValue('String');
      component.addMetadataField();
      expect(component.isDialogOpen()).toBeFalse();
    });

    it('edits existing row when editingId is set', () => {
      tableSignal.set([makeRow('edit-id', 'oldKey')]);
      component.openDialog(makeRow('edit-id', 'oldKey'));
      component.form.controls.nyckel.setValue('updatedKey');
      component.form.controls.typ.setValue('String');
      component.addMetadataField();
      expect(tableSignal()[0].nyckel).toBe('updatedKey');
      expect(tableSignal().length).toBe(1);
    });

    it('casts flervardig and aktiv to boolean', () => {
      component.openDialog();
      component.form.controls.nyckel.setValue('k');
      component.form.controls.typ.setValue('Boolean');
      component.form.controls.flervardig.setValue(true);
      component.form.controls.aktiv.setValue(false);
      component.addMetadataField();
      expect(tableSignal()[0].flervardig).toBeTrue();
      expect(tableSignal()[0].aktiv).toBeFalse();
    });
  });

  describe('removeField', () => {
    it('removes matching row', () => {
      const row = makeRow('r-1', 'k1');
      tableSignal.set([row, makeRow('r-2', 'k2')]);
      component.removeField(row);
      expect(tableSignal().length).toBe(1);
      expect(tableSignal()[0].id).toBe('r-2');
    });

    it('does nothing when row not found', () => {
      tableSignal.set([makeRow('r-1', 'k1')]);
      component.removeField(makeRow('r-99', 'missing'));
      expect(tableSignal().length).toBe(1);
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns 5 column options', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.length).toBe(5);
    });

    it('all visible by default', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.every(o => o.visible)).toBeTrue();
    });

    it('includes nyckel, typ, ordning keys', () => {
      const ids = component.getDefaultColumnOptions().map(o => o.id);
      expect(ids).toContain('nyckel');
      expect(ids).toContain('typ');
      expect(ids).toContain('ordning');
    });
  });

  describe('typeOptions', () => {
    it('has 3 type options', () => {
      expect(component.typeOptions.length).toBe(3);
    });

    it('includes Boolean, Date, String', () => {
      const ids = component.typeOptions.map(o => o.id);
      expect(ids).toContain('Boolean');
      expect(ids).toContain('Date');
      expect(ids).toContain('String');
    });
  });

  describe('columnConfig formatter (formatType)', () => {
    it('formats "String" string as "Sträng"', () => {
      const typCol = component.columnConfig.find(c => c.key === 'typ')!;
      expect(typCol.formatter!('String')).toBe('Sträng');
    });

    it('formats "Date" string as "Datum"', () => {
      const typCol = component.columnConfig.find(c => c.key === 'typ')!;
      expect(typCol.formatter!('Date')).toBe('Datum');
    });

    it('formats "Boolean" string as "Boolean"', () => {
      const typCol = component.columnConfig.find(c => c.key === 'typ')!;
      expect(typCol.formatter!('Boolean')).toBe('Boolean');
    });

    it('formats object with id "String" as "Text"', () => {
      const typCol = component.columnConfig.find(c => c.key === 'typ')!;
      expect(typCol.formatter!({ id: 'String' })).toBe('Text');
    });

    it('formats object with properties.label "Date" as "Datum"', () => {
      const typCol = component.columnConfig.find(c => c.key === 'typ')!;
      expect(typCol.formatter!({ properties: { label: 'Date' } })).toBe('Datum');
    });
  });
});
