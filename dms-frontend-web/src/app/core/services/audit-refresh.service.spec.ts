import { TestBed, fakeAsync } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuditRefreshService } from './audit-refresh.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditEntry, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

function makeDoc(overrides: Partial<NuxeoDocument> = {}): NuxeoDocument {
  return {
    uid: 'doc-1',
    type: 'Arende',
    state: 'project',
    path: '/default-domain/doc',
    title: 'Test',
    properties: {},
    contextParameters: {},
    ...overrides,
  } as unknown as NuxeoDocument;
}

function makeAuditEntry(date: string): AuditEntry {
  return { eventDate: date } as AuditEntry;
}

describe('AuditRefreshService', () => {
  let service: AuditRefreshService;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', ['getDocumentById', 'getPathInfo']);

    TestBed.configureTestingModule({
      providers: [AuditRefreshService, { provide: NuxeoApiService, useValue: nuxeoApiSpy }],
    });
    service = TestBed.inject(AuditRefreshService);
  });

  describe('getLatestAuditTimestamp', () => {
    it('returns 0 for null document', () => {
      expect(service.getLatestAuditTimestamp(null)).toBe(0);
    });

    it('returns 0 when audit array is empty', () => {
      const doc = makeDoc({ contextParameters: { audit: [] } });
      expect(service.getLatestAuditTimestamp(doc)).toBe(0);
    });

    it('returns max timestamp from audit entries', () => {
      const doc = makeDoc({
        contextParameters: {
          audit: [
            makeAuditEntry('2024-01-01T00:00:00Z'),
            makeAuditEntry('2024-06-01T00:00:00Z'),
            makeAuditEntry('2024-03-01T00:00:00Z'),
          ],
        },
      });
      const ts = service.getLatestAuditTimestamp(doc);
      expect(ts).toBe(Date.parse('2024-06-01T00:00:00Z'));
    });

    it('falls back to logDate when eventDate is absent', () => {
      const doc = makeDoc({
        contextParameters: {
          audit: [{ logDate: '2024-05-01T00:00:00Z' } as AuditEntry],
        },
      });
      expect(service.getLatestAuditTimestamp(doc)).toBe(Date.parse('2024-05-01T00:00:00Z'));
    });

    it('returns 0 for invalid date string', () => {
      const doc = makeDoc({
        contextParameters: {
          audit: [{ eventDate: 'not-a-date' } as AuditEntry],
        },
      });
      expect(service.getLatestAuditTimestamp(doc)).toBe(0);
    });
  });

  describe('loadDocumentWithAudit', () => {
    it('returns document merged with audit info', fakeAsync(() => {
      const baseDoc = makeDoc();
      const auditDoc = makeDoc({ contextParameters: { audit: [makeAuditEntry('2024-06-01T00:00:00Z')] } });

      nuxeoApiSpy.getDocumentById.and.returnValue(of(baseDoc));
      nuxeoApiSpy.getPathInfo.and.returnValue(of(auditDoc));

      let result: NuxeoDocument | undefined;
      service.loadDocumentWithAudit('doc-1').subscribe(doc => {
        result = doc;
      });

      expect(result?.contextParameters?.audit?.length).toBe(1);
    }));

    it('returns document without audit when path is missing', fakeAsync(() => {
      const doc = makeDoc({ path: '' });

      nuxeoApiSpy.getDocumentById.and.returnValue(of(doc));

      let result: NuxeoDocument | undefined;
      service.loadDocumentWithAudit('doc-1').subscribe(d => {
        result = d;
      });

      expect(nuxeoApiSpy.getPathInfo).not.toHaveBeenCalled();
      expect(result?.uid).toBe('doc-1');
    }));
  });
});
