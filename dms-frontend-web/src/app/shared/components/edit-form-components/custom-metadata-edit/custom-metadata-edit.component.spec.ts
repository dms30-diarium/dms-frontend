import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CustomMetadataEditComponent } from './custom-metadata-edit.component';
import { CustomMetadataService } from '@app/shared/services/custom-metadata.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import {
  DmsMetadataDefinitionEntry,
  DmsMetadataValueEntry,
} from '../../custom-metadata-field/custom-metadata-field.types';
import { ArendeExtendedProperties, HandlingExtendedProperties } from '@app/shared/api/nuxeo-api.types';

function makeArendeDoc(arendtypUid?: string) {
  return makeNuxeoDocument<ArendeExtendedProperties | HandlingExtendedProperties>({
    uid: 'a-1',
    type: 'Arende',
    title: 'A',
    properties: {
      [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: arendtypUid ? { uid: arendtypUid } : null,
    } as unknown as ArendeExtendedProperties | HandlingExtendedProperties,
  });
}

function makeHandlingDoc() {
  return makeNuxeoDocument<ArendeExtendedProperties | HandlingExtendedProperties>({
    uid: 'h-1',
    type: 'Handling',
    title: 'H',
    properties: {} as unknown as ArendeExtendedProperties | HandlingExtendedProperties,
  });
}

describe('CustomMetadataEditComponent', () => {
  let component: CustomMetadataEditComponent;
  let fixture: ComponentFixture<CustomMetadataEditComponent>;
  let customMetaSpy: jasmine.SpyObj<CustomMetadataService>;
  let valuesSignal: ReturnType<typeof signal<DmsMetadataValueEntry[]>>;
  let definitionsSignal: ReturnType<typeof signal<DmsMetadataDefinitionEntry[]>>;
  let definitionDocIdSignal: ReturnType<typeof signal<string | null | undefined>>;

  beforeEach(async () => {
    customMetaSpy = jasmine.createSpyObj('CustomMetadataService', [
      'normalizeDefinitions',
      'resolveDefinitionType',
      'typeToBackend',
      'getDefinitions',
    ]);
    customMetaSpy.normalizeDefinitions.and.returnValue([]);
    customMetaSpy.resolveDefinitionType.and.returnValue('string');
    customMetaSpy.typeToBackend.and.returnValue('Strang');
    customMetaSpy.getDefinitions.and.returnValue(of([]));

    valuesSignal = signal<DmsMetadataValueEntry[]>([]);
    definitionsSignal = signal<DmsMetadataDefinitionEntry[]>([]);
    definitionDocIdSignal = signal<string | null | undefined>(null);

    await TestBed.configureTestingModule({
      imports: [CustomMetadataEditComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CustomMetadataService, useValue: customMetaSpy },
      ],
    })
      .overrideTemplate(CustomMetadataEditComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CustomMetadataEditComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', makeArendeDoc());
    fixture.componentRef.setInput('valuesSignal', valuesSignal);
    fixture.componentRef.setInput('definitionsSignal', definitionsSignal);
    fixture.componentRef.setInput('definitionDocIdSignal', definitionDocIdSignal);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inlineValueColumns', () => {
    it('has 3 columns', () => {
      expect(component.inlineValueColumns.length).toBe(3);
    });

    it('columns are label, displayValue, order', () => {
      const keys = component.inlineValueColumns.map(c => c.key);
      expect(keys).toContain('label');
      expect(keys).toContain('displayValue');
      expect(keys).toContain('order');
    });
  });

  describe('inlineValueColumnOptions', () => {
    it('has 3 options', () => {
      expect(component.inlineValueColumnOptions.length).toBe(3);
    });

    it('all visible', () => {
      expect(component.inlineValueColumnOptions.every(o => o.visible)).toBeTrue();
    });
  });

  describe('valueRows computed', () => {
    it('returns empty when no definitions', () => {
      customMetaSpy.normalizeDefinitions.and.returnValue([]);
      expect(component.valueRows().length).toBe(0);
    });

    it('returns one row per definition', () => {
      customMetaSpy.normalizeDefinitions.and.returnValue([
        { key: 'field1', label: 'Field 1', type: 'string', isMulti: false, order: 1 },
      ]);
      valuesSignal.set([]);
      // trigger recompute
      fixture.componentRef.setInput(
        'definitionsSignal',
        signal<DmsMetadataDefinitionEntry[]>([{ nyckel: 'field1', typ: 'Strang' }])
      );
      fixture.detectChanges();
      // normalizeDefinitions is called on definitionsSignal()()
      expect(component.valueRows().length).toBe(1);
    });
  });

  describe('constructor effect', () => {
    it('sets definitionDocId when Arende doc has arendetyp', () => {
      fixture.componentRef.setInput('doc', makeArendeDoc('def-uid-1'));
      fixture.detectChanges();
      expect(definitionDocIdSignal()).toBe('def-uid-1');
    });

    it('calls getDefinitions when Arende doc has arendetyp uid', () => {
      customMetaSpy.getDefinitions.calls.reset();
      fixture.componentRef.setInput('doc', makeArendeDoc('def-uid-2'));
      fixture.detectChanges();
      expect(customMetaSpy.getDefinitions).toHaveBeenCalledWith('def-uid-2');
    });

    it('clears definitions when Arende doc has no arendetyp uid', () => {
      definitionsSignal.set([{ nyckel: 'x' }]);
      fixture.componentRef.setInput('doc', makeArendeDoc(undefined));
      fixture.detectChanges();
      expect(definitionsSignal()).toEqual([]);
    });

    it('returns early for non-Arende document', () => {
      const prevId = definitionDocIdSignal();
      customMetaSpy.getDefinitions.calls.reset();
      fixture.componentRef.setInput('doc', makeHandlingDoc());
      fixture.detectChanges();
      expect(customMetaSpy.getDefinitions).not.toHaveBeenCalled();
      expect(definitionDocIdSignal()).toBe(prevId);
    });
  });

  describe('onInlineValuesChange', () => {
    it('calls applyInlineEdits', () => {
      spyOn(component, 'applyInlineEdits');
      component.onInlineValuesChange([]);
      expect(component.applyInlineEdits).toHaveBeenCalled();
    });
  });

  describe('applyInlineEdits', () => {
    it('does nothing for empty editedValueRows', () => {
      const before = valuesSignal();
      component.applyInlineEdits();
      expect(valuesSignal()).toBe(before);
    });

    it('sets strangvarde for string type row', () => {
      valuesSignal.set([]);
      component.onInlineValuesChange([
        { nyckel: 'fld', label: 'F', type: 'string', displayValue: 'hello', order: 1, valueIndex: null },
      ]);
      const entries = valuesSignal();
      expect(entries.length).toBe(1);
      expect(entries[0].strangvarde).toBe('hello');
    });

    it('sets booleanvarde true for Ja', () => {
      valuesSignal.set([]);
      component.onInlineValuesChange([
        { nyckel: 'b1', label: 'B', type: 'boolean', displayValue: 'Ja', order: null, valueIndex: null },
      ]);
      expect(valuesSignal()[0].booleanvarde).toBeTrue();
    });

    it('sets booleanvarde false for Nej', () => {
      valuesSignal.set([]);
      component.onInlineValuesChange([
        { nyckel: 'b2', label: 'B', type: 'boolean', displayValue: 'Nej', order: null, valueIndex: null },
      ]);
      expect(valuesSignal()[0].booleanvarde).toBeFalse();
    });

    it('updates existing entry in valuesSignal', () => {
      valuesSignal.set([{ nyckel: 'fld', typ: 'Strang', strangvarde: 'old' }]);
      component.onInlineValuesChange([
        { nyckel: 'fld', label: 'F', type: 'string', displayValue: 'new', order: null, valueIndex: null },
      ]);
      expect(valuesSignal().length).toBe(1);
      expect(valuesSignal()[0].strangvarde).toBe('new');
    });
  });
});
