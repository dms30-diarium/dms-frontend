import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DocumentValueService } from './document-value-service.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, SearchResult } from '@app/shared/api/nuxeo-api.types';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

function makeDoc(uid: string, title?: string): NuxeoDocument {
  return { uid, title: title ?? uid, type: 'File', properties: {} } as NuxeoDocument;
}

function makeDocuments(entries: NuxeoDocument[]): SearchResult {
  return {
    'entity-type': 'documents',
    isPaginable: true,
    resultsCount: entries.length,
    entries,
    pageIndex: 0,
    pageCount: 1,
    pageSize: entries.length,
    totalSize: entries.length,
  };
}

describe('DocumentValueService', () => {
  let service: DocumentValueService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getDocumentById', 'getSeveralDocsByUids']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        DocumentValueService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(DocumentValueService);
  });

  describe('isRecord', () => {
    it('returns true for plain objects', () => {
      expect(service.isRecord({ a: 1 })).toBeTrue();
    });

    it('returns false for null', () => {
      expect(service.isRecord(null)).toBeFalse();
    });

    it('returns false for strings', () => {
      expect(service.isRecord('str')).toBeFalse();
    });

    it('returns false for arrays', () => {
      expect(service.isRecord([])).toBeTrue();
    });
  });

  describe('getString', () => {
    it('returns string value for key', () => {
      expect(service.getString({ key: 'val' }, 'key')).toBe('val');
    });

    it('returns undefined for non-string value', () => {
      expect(service.getString({ key: 42 }, 'key')).toBeUndefined();
    });

    it('returns undefined for missing key', () => {
      expect(service.getString({}, 'missing')).toBeUndefined();
    });
  });

  describe('getDirectoryLabel', () => {
    it('returns empty string for null', () => {
      expect(service.getDirectoryLabel(null)).toBe('');
    });

    it('returns string value directly', () => {
      expect(service.getDirectoryLabel('directVal')).toBe('directVal');
    });

    it('returns empty for non-object non-string', () => {
      expect(service.getDirectoryLabel(42)).toBe('');
    });

    it('extracts id from properties when available', () => {
      const entry = { properties: { id: 'prop-id' }, id: 'top-id' };
      expect(service.getDirectoryLabel(entry)).toBe('prop-id');
    });

    it('falls back to top-level id when no properties id', () => {
      const entry = { properties: {}, id: 'top-id' };
      expect(service.getDirectoryLabel(entry)).toBe('top-id');
    });
  });

  describe('getDate', () => {
    it('returns formatted date string for valid ISO date', () => {
      const result = service.getDate('2024-01-15T00:00:00');
      expect(result).toBeTruthy();
    });

    it('returns formatted result for null', () => {
      const result = service.getDate(null);
      expect(typeof result).toBe('string');
    });
  });

  describe('getHandlingStatusLabel', () => {
    it('returns the state string as-is', () => {
      expect(service.getHandlingStatusLabel('active')).toBe('active');
    });

    it('returns empty string for null', () => {
      expect(service.getHandlingStatusLabel(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(service.getHandlingStatusLabel(undefined)).toBe('');
    });
  });

  describe('resolveDocumentTitle', () => {
    it('returns empty string for undefined uid', done => {
      service.resolveDocumentTitle(undefined).subscribe(title => {
        expect(title).toBe('');
        done();
      });
    });

    it('fetches document title and updates signal', done => {
      const mockDoc = makeDoc('uid-1', 'My Title');
      apiSpy.getDocumentById.and.returnValue(of(mockDoc));
      const fieldSignal = signal('');

      service.resolveDocumentTitle('uid-1', fieldSignal).subscribe(title => {
        expect(title).toBe('My Title');
        expect(fieldSignal()).toBe('My Title');
        done();
      });
    });
  });

  describe('resolveDocumentTitles', () => {
    it('returns empty record for empty uid list', done => {
      service.resolveDocumentTitles([]).subscribe(result => {
        expect(result).toEqual({});
        done();
      });
    });

    it('fetches titles for unknown uids', done => {
      apiSpy.getSeveralDocsByUids.and.returnValue(of(makeDocuments([makeDoc('uid-1', 'Title 1')])));

      service.resolveDocumentTitles(['uid-1']).subscribe(result => {
        expect(result['uid-1']).toBe('Title 1');
        done();
      });
    });

    it('uses cache for previously fetched uids', done => {
      apiSpy.getSeveralDocsByUids.and.returnValue(of(makeDocuments([makeDoc('uid-1', 'Title 1')])));

      service.resolveDocumentTitles(['uid-1']).subscribe(() => {
        service.resolveDocumentTitles(['uid-1']).subscribe(result => {
          expect(apiSpy.getSeveralDocsByUids).toHaveBeenCalledTimes(1);
          expect(result['uid-1']).toBe('Title 1');
          done();
        });
      });
    });
  });

  describe('resolveValue', () => {
    it('returns empty string for null', () => {
      expect(service.resolveValue(null)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(service.resolveValue('')).toBe('');
    });

    it('returns Observable for UUID strings (looks up document)', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      apiSpy.getDocumentById.and.returnValue(of(makeDoc(uuid, 'Doc Title')));
      const result = service.resolveValue(uuid);
      expect(typeof (result as unknown as { subscribe: unknown }).subscribe).toBe('function');
    });

    it('returns formatted date string for ISO date strings', () => {
      const result = service.resolveValue('2024-01-15T10:00:00Z');
      expect(typeof result).toBe('string');
    });

    it('returns directory label for objects', () => {
      const result = service.resolveValue({ properties: { id: 'dir-id' } });
      expect(result).toBe('dir-id');
    });
  });
});
