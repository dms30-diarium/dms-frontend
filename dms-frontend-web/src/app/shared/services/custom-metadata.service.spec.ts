import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CustomMetadataService } from './custom-metadata.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DocumentValueService } from '@app/core/services/document-value-service.service';
import {
  DmsMetadataDefinitionEntry,
  DmsMetadataValueEntry,
} from '../components/custom-metadata-field/custom-metadata-field.types';
import { NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

function makeDefinition(overrides: Partial<DmsMetadataDefinitionEntry> = {}): DmsMetadataDefinitionEntry {
  return {
    nyckel: 'key1',
    typ: 'String',
    aktiv: true,
    ordning: 0,
    flervardig: false,
    ...overrides,
  } as DmsMetadataDefinitionEntry;
}

function makeDoc(properties: NuxeoProperties = {}): NuxeoDocument {
  return { uid: 'doc-1', title: 'Doc', type: 'File', properties } as NuxeoDocument;
}

describe('CustomMetadataService', () => {
  let service: CustomMetadataService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let docValueSpy: jasmine.SpyObj<DocumentValueService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDocumentById',
      'editDocument',
      'getSeveralDocsByUids',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    docValueSpy = jasmine.createSpyObj('DocumentValueService', [
      'getDate',
      'isRecord',
      'getString',
      'getDirectoryLabel',
      'getHandlingStatusLabel',
      'resolveValue',
      'resolveDocumentTitle',
      'resolveDocumentTitles',
    ]);
    docValueSpy.getDate.and.callFake((v: string | Date | null | undefined) => (v ? String(v) : ''));

    TestBed.configureTestingModule({
      providers: [
        CustomMetadataService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DocumentValueService, useValue: docValueSpy },
      ],
    });

    service = TestBed.inject(CustomMetadataService);
  });

  describe('getDefinitionsFromDocument', () => {
    it('returns empty array for null document', () => {
      expect(service.getDefinitionsFromDocument(null)).toEqual([]);
    });

    it('returns faltdefinition when available', () => {
      const defs = [makeDefinition({ nyckel: 'field1' })];
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: defs });
      expect(service.getDefinitionsFromDocument(doc)).toBe(defs);
    });

    it('falls back to definition when faltdefinition is absent', () => {
      const defs = [makeDefinition({ nyckel: 'def1' })];
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.definition]: defs });
      expect(service.getDefinitionsFromDocument(doc)).toBe(defs);
    });

    it('returns empty array when neither field exists', () => {
      expect(service.getDefinitionsFromDocument(makeDoc({}))).toEqual([]);
    });
  });

  describe('getMetadataValues', () => {
    it('returns provided values directly when not null', () => {
      const values: DmsMetadataValueEntry[] = [{ nyckel: 'k1' } as DmsMetadataValueEntry];
      expect(service.getMetadataValues(null, values)).toBe(values);
    });

    it('returns empty array for null document and no values', () => {
      expect(service.getMetadataValues(null, undefined)).toEqual([]);
    });

    it('extracts falt values from document', () => {
      const falt = [{ nyckel: 'k1', strangvarde: 'v1' } as DmsMetadataValueEntry];
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.falt]: falt });
      expect(service.getMetadataValues(doc, null)).toBe(falt);
    });

    it('falls back to metadata field', () => {
      const meta = [{ nyckel: 'k2', strangvarde: 'v2' } as DmsMetadataValueEntry];
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.metadata]: meta });
      expect(service.getMetadataValues(doc, undefined)).toBe(meta);
    });
  });

  describe('normalizeDefinitions', () => {
    it('filters out inactive definitions by default', () => {
      const defs = [
        makeDefinition({ nyckel: 'active', aktiv: true }),
        makeDefinition({ nyckel: 'inactive', aktiv: false }),
      ];
      const result = service.normalizeDefinitions(defs);
      expect(result.length).toBe(1);
      expect(result[0].key).toBe('active');
    });

    it('includes all when activeOnly is false', () => {
      const defs = [
        makeDefinition({ nyckel: 'active', aktiv: true }),
        makeDefinition({ nyckel: 'inactive', aktiv: false }),
      ];
      const result = service.normalizeDefinitions(defs, false);
      expect(result.length).toBe(2);
    });

    it('filters out definitions with no nyckel', () => {
      const defs = [makeDefinition({ nyckel: undefined }), makeDefinition({ nyckel: 'valid' })];
      const result = service.normalizeDefinitions(defs);
      expect(result.length).toBe(1);
    });

    it('sorts by ordning numerically', () => {
      const defs = [
        makeDefinition({ nyckel: 'b', ordning: 2 }),
        makeDefinition({ nyckel: 'a', ordning: 1 }),
        makeDefinition({ nyckel: 'c', ordning: 3 }),
      ];
      const result = service.normalizeDefinitions(defs);
      expect(result[0].key).toBe('a');
      expect(result[1].key).toBe('b');
      expect(result[2].key).toBe('c');
    });
  });

  describe('resolveDefinitionType', () => {
    it('returns "boolean" for Boolean type', () => {
      expect(service.resolveDefinitionType('Boolean')).toBe('boolean');
    });

    it('returns "boolean" for lowercase boolean', () => {
      expect(service.resolveDefinitionType('boolean')).toBe('boolean');
    });

    it('returns "date" for Date type', () => {
      expect(service.resolveDefinitionType('Date')).toBe('date');
    });

    it('returns "string" for unknown types', () => {
      expect(service.resolveDefinitionType('String')).toBe('string');
      expect(service.resolveDefinitionType('unknown')).toBe('string');
    });

    it('reads id from object type', () => {
      expect(service.resolveDefinitionType({ id: 'Boolean' })).toBe('boolean');
    });
  });

  describe('typeToBackend', () => {
    it('converts boolean to Boolean', () => {
      expect(service.typeToBackend('boolean')).toBe('Boolean');
    });

    it('converts date to Date', () => {
      expect(service.typeToBackend('date')).toBe('Date');
    });

    it('converts string to String', () => {
      expect(service.typeToBackend('string')).toBe('String');
    });
  });

  describe('stringifyValue', () => {
    it('returns empty string for undefined value', () => {
      expect(service.stringifyValue('string', false, undefined)).toBe('');
    });

    it('returns strangvarde for string type', () => {
      const v = { strangvarde: 'hello' } as DmsMetadataValueEntry;
      expect(service.stringifyValue('string', false, v)).toBe('hello');
    });

    it('joins array values for string multi when no strangvarde', () => {
      const v = { strangfleravarden: ['a', 'b'] } as DmsMetadataValueEntry;
      expect(service.stringifyValue('string', true, v)).toBe('a, b');
    });

    it('formats boolean value', () => {
      const v = { booleanvarde: true } as DmsMetadataValueEntry;
      expect(service.stringifyValue('boolean', false, v)).toBe('Ja');
    });

    it('formats false boolean', () => {
      const v = { booleanvarde: false } as DmsMetadataValueEntry;
      expect(service.stringifyValue('boolean', false, v)).toBe('Nej');
    });

    it('returns empty for null boolean', () => {
      const v = { booleanvarde: null } as DmsMetadataValueEntry;
      expect(service.stringifyValue('boolean', false, v)).toBe('');
    });

    it('formats date value', () => {
      const v = { datumvarde: '2024-01-01' } as DmsMetadataValueEntry;
      expect(service.stringifyValue('date', false, v)).toBe('2024-01-01');
    });

    it('returns empty for null date', () => {
      const v = { datumvarde: null } as DmsMetadataValueEntry;
      expect(service.stringifyValue('date', false, v)).toBe('');
    });
  });
});
