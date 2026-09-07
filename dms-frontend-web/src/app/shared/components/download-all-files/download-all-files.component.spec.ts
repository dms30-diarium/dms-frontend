import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HttpHeaders, HttpResponse } from '@angular/common/http';

import { DownloadAllFilesComponent } from './download-all-files.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { FileItem, Filer } from '@app/pages/case-page/case-types';

function makeFileGroup(handlingId: string, files: { id: string; name: string }[]): FileItem {
  return {
    id: handlingId,
    title: `Handling ${handlingId}`,
    filer: files.map(f => ({
      id: f.id,
      filename: f.name,
      title: f.name,
      digest: 'abc',
      digestAlgorith: 'md5',
      mimetype: 'application/pdf',
      length: 1024,
    })),
  };
}

function makeDownloadResponse(filename: string): HttpResponse<Blob> {
  return new HttpResponse<Blob>({
    body: new Blob(['content']),
    headers: new HttpHeaders({ 'content-disposition': `attachment; filename="${filename}"` }),
    status: 200,
  });
}

function makeFile(): Filer {
  return {
    id: 'f1',
    filename: 'a.pdf',
    title: 'a.pdf',
    digest: 'abc',
    digestAlgorith: 'md5',
    mimetype: 'application/pdf',
    length: 1024,
  };
}

describe('DownloadAllFilesComponent', () => {
  let component: DownloadAllFilesComponent;
  let fixture: ComponentFixture<DownloadAllFilesComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDownloadAllFiles',
      'downloadAllFiles',
      'LaddanerZipExport',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDownloadAllFiles.and.returnValue(of([]));
    apiSpy.downloadAllFiles.and.returnValue(of(makeDownloadResponse('files.zip')));
    apiSpy.LaddanerZipExport.and.returnValue(of(makeDownloadResponse('export.zip')));

    await TestBed.configureTestingModule({
      imports: [DownloadAllFilesComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(DownloadAllFilesComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DownloadAllFilesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('caseUid', 'case-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getDownloadAllFiles with caseUid', () => {
      expect(apiSpy.getDownloadAllFiles).toHaveBeenCalledWith('case-1');
    });

    it('sets filesByHandling from API response', () => {
      apiSpy.getDownloadAllFiles.and.returnValue(of([makeFileGroup('h1', [{ id: 'f1', name: 'file.pdf' }])]));
      component.ngOnInit();
      expect(component.filesByHandling().length).toBe(1);
    });

    it('initializes form controls for each file', () => {
      apiSpy.getDownloadAllFiles.and.returnValue(of([makeFileGroup('h1', [{ id: 'file-id-1', name: 'f.pdf' }])]));
      component.ngOnInit();
      expect(component.form.contains('file-id-1')).toBeTrue();
    });
  });

  describe('signals initial state', () => {
    it('isDownloading defaults to false', () => {
      expect(component.isDownloading()).toBeFalse();
    });

    it('selectedFileIds defaults to empty', () => {
      expect(component.selectedFileIds()).toEqual([]);
    });

    it('selectedCount defaults to 0', () => {
      expect(component.selectedCount()).toBe(0);
    });

    it('allFileIds is empty when no files', () => {
      expect(component.allFileIds()).toEqual([]);
    });
  });

  describe('toggleHandlingFiles', () => {
    it('checks all files in group', () => {
      const group = makeFileGroup('h1', [
        { id: 'f1', name: 'a.pdf' },
        { id: 'f2', name: 'b.pdf' },
      ]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      component.toggleHandlingFiles(group, true);
      expect(component.form.controls['f1'].value).toBeTrue();
      expect(component.form.controls['f2'].value).toBeTrue();
    });

    it('unchecks all files in group', () => {
      const group = makeFileGroup('h1', [{ id: 'f1', name: 'a.pdf' }]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      component.toggleHandlingFiles(group, true);
      component.toggleHandlingFiles(group, false);
      expect(component.form.controls['f1'].value).toBeFalse();
    });
  });

  describe('isAllHandlingFilesSelected', () => {
    it('returns false when no files selected', () => {
      const group = makeFileGroup('h1', [{ id: 'f1', name: 'a.pdf' }]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      expect(component.isAllHandlingFilesSelected(group)).toBeFalse();
    });

    it('returns true when all files selected', () => {
      const group = makeFileGroup('h1', [{ id: 'f1', name: 'a.pdf' }]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      component.toggleHandlingFiles(group, true);
      expect(component.isAllHandlingFilesSelected(group)).toBeTrue();
    });
  });

  describe('selectedCountForHandling', () => {
    it('returns 0 when no files selected', () => {
      const group = makeFileGroup('h1', [
        { id: 'f1', name: 'a.pdf' },
        { id: 'f2', name: 'b.pdf' },
      ]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      expect(component.selectedCountForHandling(group)).toBe(0);
    });

    it('returns count of selected files', () => {
      const group = makeFileGroup('h1', [
        { id: 'f1', name: 'a.pdf' },
        { id: 'f2', name: 'b.pdf' },
      ]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      component.toggleHandlingFiles(group, true);
      expect(component.selectedCountForHandling(group)).toBe(2);
    });
  });

  describe('downloadFiles', () => {
    it('does nothing when no files selected', () => {
      component.downloadFiles();
      expect(apiSpy.downloadAllFiles).not.toHaveBeenCalled();
    });

    it('calls downloadAllFiles when mode is merge-all', () => {
      const group = makeFileGroup('h1', [{ id: 'f1', name: 'a.pdf' }]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      component.toggleHandlingFiles(group, true);
      component.downloadModeControl.setValue('merge-all');
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:url');
      spyOn(window.URL, 'revokeObjectURL');
      component.downloadFiles();
      expect(apiSpy.downloadAllFiles).toHaveBeenCalledWith('case-1', ['f1']);
    });

    it('calls LaddanerZipExport when mode is separate-files', () => {
      const group = makeFileGroup('h1', [{ id: 'f1', name: 'a.pdf' }]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      component.toggleHandlingFiles(group, true);
      component.downloadModeControl.setValue('separate-files');
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:url');
      spyOn(window.URL, 'revokeObjectURL');
      component.downloadFiles();
      expect(apiSpy.LaddanerZipExport).toHaveBeenCalled();
    });
  });

  describe('onDownloadModeChange', () => {
    it('sets merge-all mode', () => {
      component.downloadModeControl.setValue('separate-files');
      component.onDownloadModeChange('merge-all');
      expect(component.downloadModeControl.value).toBe('merge-all');
    });

    it('sets separate-files mode', () => {
      component.onDownloadModeChange('separate-files');
      expect(component.downloadModeControl.value).toBe('separate-files');
    });

    it('ignores invalid mode', () => {
      component.downloadModeControl.setValue('merge-all');
      component.onDownloadModeChange('invalid');
      expect(component.downloadModeControl.value).toBe('merge-all');
    });
  });

  describe('getFileCount', () => {
    it('returns formatted string', () => {
      expect(component.getFileCount(2, 5)).toBe('2(5)');
    });
  });

  describe('getOriginalFormat', () => {
    it('returns file mimetype', () => {
      const file = makeFile();
      expect(component.getOriginalFormat(file)).toBe('application/pdf');
    });
  });

  describe('getFileSize', () => {
    it('returns formatted size string', () => {
      const file = makeFile();
      const result = component.getFileSize(file);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('toggleHandlingSelection', () => {
    it('toggles all files when none selected', () => {
      const group = makeFileGroup('h1', [{ id: 'f1', name: 'a.pdf' }]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      component.toggleHandlingSelection(group);
      expect(component.form.controls['f1'].value).toBeTrue();
    });

    it('deselects all files when all selected', () => {
      const group = makeFileGroup('h1', [{ id: 'f1', name: 'a.pdf' }]);
      apiSpy.getDownloadAllFiles.and.returnValue(of([group]));
      component.ngOnInit();
      component.toggleHandlingFiles(group, true);
      component.toggleHandlingSelection(group);
      expect(component.form.controls['f1'].value).toBeFalse();
    });
  });
});
