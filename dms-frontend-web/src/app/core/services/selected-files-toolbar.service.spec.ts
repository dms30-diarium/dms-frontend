import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { SelectedFilesToolbarService } from './selected-files-toolbar.service';
import { GeneralStore } from './general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { PrintService } from './print.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

function makeDoc(uid: string): NuxeoDocument {
  return { uid, title: uid, type: 'File', path: `/${uid}`, properties: {} } as unknown as NuxeoDocument;
}

describe('SelectedFilesToolbarService', () => {
  let service: SelectedFilesToolbarService;
  let storeSpy: jasmine.SpyObj<GeneralStore>;
  let printSpy: jasmine.SpyObj<PrintService>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    storeSpy = jasmine.createSpyObj('GeneralStore', ['notification'], {
      notification: jasmine.createSpyObj('notification', ['set']),
    });
    printSpy = jasmine.createSpyObj('PrintService', ['getPrintableDocuments', 'printDocuments']);
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['downloadBulk', 'downloadAllFiles', 'getMessagesJSON']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        SelectedFilesToolbarService,
        { provide: GeneralStore, useValue: storeSpy },
        { provide: PrintService, useValue: printSpy },
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(SelectedFilesToolbarService);
  });

  describe('updateFileSelection', () => {
    it('adds file uid when selected=true', () => {
      const ids = signal(new Set<string>());
      TestBed.runInInjectionContext(() => {
        service.updateFileSelection(ids, { file: makeDoc('doc-1'), selected: true });
      });
      expect(ids().has('doc-1')).toBeTrue();
    });

    it('removes file uid when selected=false', () => {
      const ids = signal(new Set<string>(['doc-1']));
      TestBed.runInInjectionContext(() => {
        service.updateFileSelection(ids, { file: makeDoc('doc-1'), selected: false });
      });
      expect(ids().has('doc-1')).toBeFalse();
    });

    it('does not mutate existing set', () => {
      const original = new Set<string>(['doc-1']);
      const ids = signal(original);
      TestBed.runInInjectionContext(() => {
        service.updateFileSelection(ids, { file: makeDoc('doc-2'), selected: true });
      });
      expect(original.has('doc-2')).toBeFalse();
    });
  });

  describe('updateAttachmentSelection', () => {
    it('adds multiple files when selected=true', () => {
      const ids = signal(new Set<string>());
      TestBed.runInInjectionContext(() => {
        service.updateAttachmentSelection(ids, {
          files: [makeDoc('a'), makeDoc('b')],
          selected: true,
        });
      });
      expect(ids().has('a')).toBeTrue();
      expect(ids().has('b')).toBeTrue();
    });

    it('removes multiple files when selected=false', () => {
      const ids = signal(new Set<string>(['a', 'b', 'c']));
      TestBed.runInInjectionContext(() => {
        service.updateAttachmentSelection(ids, {
          files: [makeDoc('a'), makeDoc('b')],
          selected: false,
        });
      });
      expect(ids().has('a')).toBeFalse();
      expect(ids().has('b')).toBeFalse();
      expect(ids().has('c')).toBeTrue();
    });
  });

  describe('clearSelection', () => {
    it('empties the selection set', () => {
      const ids = signal(new Set<string>(['x', 'y']));
      TestBed.runInInjectionContext(() => {
        service.clearSelection(ids);
      });
      expect(ids().size).toBe(0);
    });
  });

  describe('downloadSelectedFilesAsZip', () => {
    it('sets warning notification when selection is empty', () => {
      service.downloadSelectedFilesAsZip(new Set());
      expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'warning' }));
    });

    it('calls downloadBulk when files selected', () => {
      apiSpy.downloadBulk.and.returnValue(of(new Blob()));
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:url');
      service.downloadSelectedFilesAsZip(new Set(['doc-1']));
      expect(apiSpy.downloadBulk).toHaveBeenCalledWith(['doc-1']);
    });
  });
});
