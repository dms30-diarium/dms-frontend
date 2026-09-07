import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SelectHandlingsComponent } from './select-handlings.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { FileItem } from '@app/pages/case-page/case-types';

function makeFileGroup(handlingId: string, fileIds: string[]): FileItem {
  return {
    id: handlingId,
    title: `H ${handlingId}`,
    filer: fileIds.map(id => ({
      id,
      filename: `${id}.pdf`,
      title: `${id}.pdf`,
      digestAlgorith: 'md5',
      digest: 'abc',
      length: 1024,
      mimetype: 'application/pdf',
    })),
  };
}

describe('SelectHandlingsComponent', () => {
  let component: SelectHandlingsComponent;
  let fixture: ComponentFixture<SelectHandlingsComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let formChangeSpy: jasmine.Spy;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getDownloadAllFiles']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDownloadAllFiles.and.returnValue(of([]));
    formChangeSpy = jasmine.createSpy('formChange');

    await TestBed.configureTestingModule({
      imports: [SelectHandlingsComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(SelectHandlingsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(SelectHandlingsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('caseId', 'case-1');
    fixture.componentRef.setInput('formChange', formChangeSpy);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getDownloadAllFiles with caseId', () => {
      expect(apiSpy.getDownloadAllFiles).toHaveBeenCalledWith('case-1');
    });

    it('initializes form controls for each file', () => {
      apiSpy.getDownloadAllFiles.and.returnValue(of([makeFileGroup('h1', ['f1', 'f2'])]));
      component.ngOnInit();
      expect(component.form.contains('f1')).toBeTrue();
      expect(component.form.contains('f2')).toBeTrue();
    });
  });

  describe('allFileIds computed', () => {
    it('returns empty when no file groups', () => {
      expect(component.allFileIds()).toEqual([]);
    });

    it('returns all file ids from all groups', () => {
      apiSpy.getDownloadAllFiles.and.returnValue(of([makeFileGroup('h1', ['f1', 'f2'])]));
      component.ngOnInit();
      expect(component.allFileIds()).toEqual(['f1', 'f2']);
    });
  });

  describe('toggleHandlingFiles', () => {
    beforeEach(() => {
      apiSpy.getDownloadAllFiles.and.returnValue(of([makeFileGroup('h1', ['f1', 'f2'])]));
      component.ngOnInit();
    });

    it('checks all files in group', () => {
      const group = component.filesByHandling()[0];
      component.toggleHandlingFiles(group.filer, true);
      expect(component.form.controls['f1'].value).toBeTrue();
      expect(component.form.controls['f2'].value).toBeTrue();
    });

    it('unchecks all files in group', () => {
      const group = component.filesByHandling()[0];
      component.toggleHandlingFiles(group.filer, true);
      component.toggleHandlingFiles(group.filer, false);
      expect(component.form.controls['f1'].value).toBeFalse();
    });

    it('calls formChange after toggling', () => {
      const group = component.filesByHandling()[0];
      formChangeSpy.calls.reset();
      component.toggleHandlingFiles(group.filer, true);
      expect(formChangeSpy).toHaveBeenCalledWith(['f1', 'f2']);
    });
  });

  describe('isAllHandlingFilesSelected', () => {
    beforeEach(() => {
      apiSpy.getDownloadAllFiles.and.returnValue(of([makeFileGroup('h1', ['f1'])]));
      component.ngOnInit();
    });

    it('returns false when no files selected', () => {
      const group = component.filesByHandling()[0];
      expect(component.isAllHandlingFilesSelected(group.filer)).toBeFalse();
    });

    it('returns true when all files selected', () => {
      const group = component.filesByHandling()[0];
      component.toggleHandlingFiles(group.filer, true);
      expect(component.isAllHandlingFilesSelected(group.filer)).toBeTrue();
    });
  });

  describe('selectedCountForHandling', () => {
    beforeEach(() => {
      apiSpy.getDownloadAllFiles.and.returnValue(of([makeFileGroup('h1', ['f1', 'f2'])]));
      component.ngOnInit();
    });

    it('returns 0 when none selected', () => {
      const group = component.filesByHandling()[0];
      expect(component.selectedCountForHandling(group.filer)).toBe(0);
    });

    it('returns 2 when all selected', () => {
      const group = component.filesByHandling()[0];
      component.toggleHandlingFiles(group.filer, true);
      expect(component.selectedCountForHandling(group.filer)).toBe(2);
    });
  });

  describe('toggleHandlingSelection', () => {
    beforeEach(() => {
      apiSpy.getDownloadAllFiles.and.returnValue(of([makeFileGroup('h1', ['f1'])]));
      component.ngOnInit();
    });

    it('selects all when none selected', () => {
      const group = component.filesByHandling()[0];
      component.toggleHandlingSelection(group);
      expect(component.form.controls['f1'].value).toBeTrue();
    });

    it('deselects all when all selected', () => {
      const group = component.filesByHandling()[0];
      component.toggleHandlingFiles(group.filer, true);
      component.toggleHandlingSelection(group);
      expect(component.form.controls['f1'].value).toBeFalse();
    });
  });
});
