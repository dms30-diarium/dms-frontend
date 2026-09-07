import { TestBed } from '@angular/core/testing';
import { ShareLinkService } from './share-link.service';

describe('ShareLinkService', () => {
  let service: ShareLinkService;
  let writeTextSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ShareLinkService] });
    service = TestBed.inject(ShareLinkService);
    if (jasmine.isSpy(navigator.clipboard.writeText)) {
      writeTextSpy = navigator.clipboard.writeText as jasmine.Spy;
      writeTextSpy.calls.reset();
      writeTextSpy.and.returnValue(Promise.resolve());
      return;
    }
    writeTextSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
  });

  describe('buildDocLink', () => {
    it('returns empty string for null docId', () => {
      expect(service.buildDocLink(null)).toBe('');
    });

    it('returns empty string for undefined docId', () => {
      expect(service.buildDocLink(undefined)).toBe('');
    });

    it('returns empty string for empty string docId', () => {
      expect(service.buildDocLink('')).toBe('');
    });

    it('builds link with window.location.origin', () => {
      const link = service.buildDocLink('doc-123');
      expect(link).toBe(`${window.location.origin}/nuxeo/app/doc/doc-123`);
    });

    it('includes docId in the URL', () => {
      const link = service.buildDocLink('abc-uuid');
      expect(link).toContain('abc-uuid');
    });
  });

  describe('copyDocumentLink', () => {
    it('does nothing for null docId', () => {
      const setCopied = jasmine.createSpy('setCopied');
      service.copyDocumentLink(null, setCopied);
      expect(writeTextSpy).not.toHaveBeenCalled();
    });

    it('calls clipboard.writeText with built link', async () => {
      const setCopied = jasmine.createSpy('setCopied');
      service.copyDocumentLink('doc-1', setCopied, 0);
      await Promise.resolve();
      expect(writeTextSpy).toHaveBeenCalledWith(jasmine.stringContaining('doc-1'));
      expect(setCopied).toHaveBeenCalledWith(true);
    });
  });
});
