import { TestBed } from '@angular/core/testing';
import { PrintService } from './print.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

function makeFileDoc(mimeType: string, name = 'doc.pdf', uid = 'uid-1', changeToken?: string): NuxeoDocument {
  return makeNuxeoDocument({
    uid,
    type: 'File',
    title: 'T',
    changeToken,
    properties: {
      [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': mimeType, name },
    },
  });
}

function makeWatermarkDoc(mimeType: string, name = 'doc.pdf', uid = 'uid-1'): NuxeoDocument {
  return makeNuxeoDocument({
    uid,
    type: 'File',
    title: 'T',
    properties: {
      [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': '', name: '' },
      [NUXEO_SCHEMA_FIELDS.fil.vattenstampel]: { 'mime-type': mimeType, name },
    } as NuxeoDocument['properties'],
  });
}

describe('PrintService', () => {
  let service: PrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrintService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('getPrintableTarget', () => {
    it('returns null for video mimetype', () => {
      expect(service.getPrintableTarget(makeFileDoc('video/mp4'))).toBeNull();
    });

    it('returns null for audio mimetype', () => {
      expect(service.getPrintableTarget(makeFileDoc('audio/mpeg'))).toBeNull();
    });

    it('returns delayMs 500 for image mimetype', () => {
      const result = service.getPrintableTarget(makeFileDoc('image/jpeg', 'photo.jpg'));
      expect(result?.delayMs).toBe(500);
    });

    it('returns url containing uid for image', () => {
      const result = service.getPrintableTarget(makeFileDoc('image/png', 'img.png', 'doc-abc'));
      expect(result?.url).toContain('doc-abc');
    });

    it('returns delayMs 1500 for PDF', () => {
      const result = service.getPrintableTarget(makeFileDoc('application/pdf'));
      expect(result?.delayMs).toBe(1500);
    });

    it('returns pdf viewer url for PDF', () => {
      const result = service.getPrintableTarget(makeFileDoc('application/pdf', 'doc.pdf', 'uid-1'));
      expect(result?.url).toContain('viewer.html');
      expect(result?.url).toContain('uid-1');
    });

    it('returns pdf viewer url via rendition for unknown mimetype', () => {
      const result = service.getPrintableTarget(makeFileDoc('application/msword', 'doc.docx', 'uid-2'));
      expect(result?.url).toContain('viewer.html');
      expect(decodeURIComponent(result?.url ?? '')).toContain('@rendition/pdf');
    });

    it('uses watermark content when file content has no mime-type or name', () => {
      const result = service.getPrintableTarget(makeWatermarkDoc('application/pdf', 'wm.pdf', 'uid-3'));
      expect(result?.delayMs).toBe(1500);
    });

    it('includes changeToken in url when provided', () => {
      const doc = makeFileDoc('image/jpeg', 'img.jpg', 'uid-4', 'tok-123');
      const result = service.getPrintableTarget(doc);
      expect(result?.url).toContain('changeToken=tok-123');
    });

    it('returns url without changeToken when changeToken absent', () => {
      const doc = makeFileDoc('image/jpeg', 'img.jpg', 'uid-5', undefined);
      const result = service.getPrintableTarget(doc);
      expect(result?.url).not.toContain('changeToken');
    });
  });

  describe('getPrintableDocuments', () => {
    it('filters out non-printable files', () => {
      const docs = [makeFileDoc('video/mp4'), makeFileDoc('application/pdf')];
      const result = service.getPrintableDocuments(docs);
      expect(result.length).toBe(1);
      expect(result[0].file).toBe(docs[1]);
    });

    it('returns empty for empty input', () => {
      expect(service.getPrintableDocuments([])).toEqual([]);
    });

    it('includes url and file for each printable doc', () => {
      const doc = makeFileDoc('image/png', 'i.png', 'u1');
      const results = service.getPrintableDocuments([doc]);
      expect(results[0].file).toBe(doc);
      expect(results[0].url).toBeTruthy();
    });
  });

  describe('printDocuments', () => {
    it('calls onDone immediately for empty queue', () => {
      const onDone = jasmine.createSpy('onDone');
      const onBeforePrint = jasmine.createSpy('onBeforePrint');
      service.printDocuments([], onBeforePrint, onDone);
      expect(onDone).toHaveBeenCalled();
    });

    it('calls onBeforePrint with first file', () => {
      const onBeforePrint = jasmine.createSpy('onBefore');
      const onDone = jasmine.createSpy('onDone');
      spyOn(service, 'printUrl').and.callFake((_url, _delay, cb) => cb?.());
      const doc = makeFileDoc('application/pdf');
      service.printDocuments([{ file: doc, url: '/test', delayMs: 100 }], onBeforePrint, onDone);
      expect(onBeforePrint).toHaveBeenCalledWith(doc);
    });
  });
});
