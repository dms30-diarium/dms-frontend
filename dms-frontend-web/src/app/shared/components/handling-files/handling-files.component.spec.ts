import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HandlingFilesComponent } from './handling-files.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoFileDocument } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

function makeFile(uid: string, filType: 'huvudfil' | 'bilaga'): NuxeoFileDocument {
  return makeNuxeoDocument<NuxeoFileDocument['properties']>({
    uid,
    type: 'File',
    title: uid,
    properties: {
      [NUXEO_SCHEMA_FIELDS.fil.typ]: filType,
      [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'application/pdf', name: `${uid}.pdf` },
    },
  });
}

describe('HandlingFilesComponent', () => {
  let component: HandlingFilesComponent;
  let fixture: ComponentFixture<HandlingFilesComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['downloadFile']);
    apiSpy.downloadFile.and.returnValue('/download/url');

    await TestBed.configureTestingModule({
      imports: [HandlingFilesComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(HandlingFilesComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(HandlingFilesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('files', [
      makeFile('f1', NUXEO_VOCAB_IDS.filTyp.huvudfil),
      makeFile('f2', 'bilaga'),
      makeFile('f3', 'bilaga'),
    ]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getDownloadUrl', () => {
    it('returns undefined for empty uid', () => {
      expect(component.getDownloadUrl('')).toBeUndefined();
    });

    it('calls nuxeoApi.downloadFile for valid uid', () => {
      const result = component.getDownloadUrl('f1');
      expect(apiSpy.downloadFile).toHaveBeenCalledWith('f1');
      expect(result).toBe('/download/url');
    });
  });

  describe('mainFiles / attachmentFiles', () => {
    it('mainFiles returns only huvudfil type', () => {
      expect(component.mainFiles().length).toBe(1);
      expect(component.mainFiles()[0].uid).toBe('f1');
    });

    it('attachmentFiles returns non-huvudfil files', () => {
      expect(component.attachmentFiles().length).toBe(2);
    });
  });

  describe('allAttachmentFilesSelected', () => {
    it('false when no files selected', () => {
      expect(component.allAttachmentFilesSelected()).toBeFalse();
    });

    it('true when all attachment files selected', () => {
      fixture.componentRef.setInput('selectedFileIds', new Set(['f2', 'f3']));
      fixture.detectChanges();
      expect(component.allAttachmentFilesSelected()).toBeTrue();
    });
  });

  describe('event emitters', () => {
    it('onSelect emits fileSelected', () => {
      const spy = jasmine.createSpy('select');
      component.fileSelected.subscribe(spy);
      const file = makeFile('f1', 'huvudfil');
      component.onSelect(file);
      expect(spy).toHaveBeenCalledWith(file);
    });

    it('onPreview emits filePreview', () => {
      const spy = jasmine.createSpy('preview');
      component.filePreview.subscribe(spy);
      const file = makeFile('f1', 'huvudfil');
      component.onPreview(file);
      expect(spy).toHaveBeenCalledWith(file);
    });

    it('onPrint emits filePrint', () => {
      const spy = jasmine.createSpy('print');
      component.filePrint.subscribe(spy);
      const file = makeFile('f1', 'huvudfil');
      component.onPrint(file);
      expect(spy).toHaveBeenCalledWith(file);
    });

    it('onSelectionChange emits selectionChange with checked state', () => {
      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);
      const file = makeFile('f1', 'huvudfil');
      const input = document.createElement('input');
      input.checked = true;
      component.onSelectionChange(file, { currentTarget: input } as unknown as Event);
      expect(spy).toHaveBeenCalledWith({ file, selected: true });
    });

    it('onSelectionChange does nothing for non-input target', () => {
      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);
      const file = makeFile('f1', 'huvudfil');
      component.onSelectionChange(file, { currentTarget: null } as unknown as Event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('toggleAttachmentSelection emits attachmentSelectionChange', () => {
      const spy = jasmine.createSpy('toggle');
      component.attachmentSelectionChange.subscribe(spy);
      component.toggleAttachmentSelection();
      expect(spy).toHaveBeenCalledWith({ files: component.attachmentFiles(), selected: true });
    });
  });
});
