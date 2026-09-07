import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DocumentInfoPanelComponent } from './document-info-panel.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { makeNuxeoDocument, makeAuditEntry, makeAuditLogEntries } from '@app/shared/testing/mock-factories';
import { NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';

function makeDoc(overrides: Record<string, unknown> = {}) {
  return makeNuxeoDocument({
    uid: 'doc-1',
    title: 'Test Document',
    type: 'Handling',
    state: 'project',
    path: '/default-domain/workspaces/test',
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Document',
      [NUXEO_SCHEMA_FIELDS.dc.creator]: null,
      [NUXEO_SCHEMA_FIELDS.dc.contributors]: [],
      [NUXEO_SCHEMA_FIELDS.nxtag.tags]: [],
      [NUXEO_SCHEMA_FIELDS.files.files]: [],
      [NUXEO_SCHEMA_FIELDS.arkiv.myndighet]: '',
      ...overrides,
    } as unknown as NuxeoProperties,
  });
}

function makeStoreMock() {
  return {
    notification: { set: jasmine.createSpy('set') },
    navigationPanelContext: () => null,
    messagesInfo: signal<Record<string, string> | null>(null),
    getValue: jasmine.createSpy('getValue').and.returnValue(null),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(''),
    getLabelByType: jasmine.createSpy('getLabelByType').and.returnValue(''),
  };
}

describe('DocumentInfoPanelComponent', () => {
  let component: DocumentInfoPanelComponent;
  let fixture: ComponentFixture<DocumentInfoPanelComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let storeMock: ReturnType<typeof makeStoreMock>;

  beforeEach(async () => {
    storeMock = makeStoreMock();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDocumentAudit',
      'getDocumentById',
      'tagDocument',
      'untagDocument',
      'editDocument',
      'uploadFile',
      'attachFile',
      'initializeUpload',
      'deleteAttachment',
      'getEntriesForParentPath',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDocumentAudit.and.returnValue(of(makeAuditLogEntries({ entries: [] })));
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.tagDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.untagDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.uploadFile.and.returnValue(of({}));
    apiSpy.attachFile.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-1' }));
    (apiSpy.deleteAttachment as jasmine.Spy).and.returnValue(of(undefined));
    (apiSpy.getEntriesForParentPath as jasmine.Spy).and.returnValue(of({ entries: [] }));

    await TestBed.configureTestingModule({
      imports: [DocumentInfoPanelComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeMock },
      ],
    })
      .overrideTemplate(DocumentInfoPanelComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DocumentInfoPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('document', makeDoc());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('title computed', () => {
    it('returns dc:title property', () => {
      expect(component.title()).toBe('Test Document');
    });

    it('falls back to doc.title when no dc:title', () => {
      fixture.componentRef.setInput('document', makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.title]: '' }));
      fixture.detectChanges();
      expect(component.title()).toBe('Test Document');
    });
  });

  describe('isNoteDocument computed', () => {
    it('returns false for Handling type', () => {
      expect(component.isNoteDocument()).toBeFalse();
    });

    it('returns true for Note type', () => {
      fixture.componentRef.setInput('document', makeDoc({ type: 'Note' }));
      const doc = makeDoc();
      doc.type = 'Note';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.isNoteDocument()).toBeTrue();
    });
  });

  describe('isFileDocument computed', () => {
    it('returns false for Handling', () => {
      expect(component.isFileDocument()).toBeFalse();
    });

    it('returns true for Fil', () => {
      const doc = makeDoc();
      doc.type = 'Fil';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.isFileDocument()).toBeTrue();
    });

    it('returns true for File', () => {
      const doc = makeDoc();
      doc.type = 'File';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.isFileDocument()).toBeTrue();
    });

    it('returns true for Utkastmall', () => {
      const doc = makeDoc();
      doc.type = 'Utkastmall';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.isFileDocument()).toBeTrue();
    });
  });

  describe('isSimpleTemplateDocument computed', () => {
    it('returns false for Handling', () => {
      expect(component.isSimpleTemplateDocument()).toBeFalse();
    });

    it('returns true for Utkastmall', () => {
      const doc = makeDoc();
      doc.type = 'Utkastmall';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.isSimpleTemplateDocument()).toBeTrue();
    });

    it('returns true for EPostmall', () => {
      const doc = makeDoc();
      doc.type = 'EPostmall';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.isSimpleTemplateDocument()).toBeTrue();
    });
  });

  describe('isArkivDocument computed', () => {
    it('returns false for Handling', () => {
      expect(component.isArkivDocument()).toBeFalse();
    });

    it('returns true for Arkiv', () => {
      const doc = makeDoc();
      doc.type = 'Arkiv';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.isArkivDocument()).toBeTrue();
    });
  });

  describe('getDate', () => {
    it('returns empty string for null', () => {
      expect(component.getDate(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(component.getDate(undefined)).toBe('');
    });

    it('formats a valid date string', () => {
      const result = component.getDate('2024-06-15');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('uses first element when given an array', () => {
      const result = component.getDate(['2024-06-15', '2024-12-31']);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCreator', () => {
    it('returns empty string when creator is null', () => {
      expect(component.getCreator()).toBe('');
    });

    it('returns full name from creator properties', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.creator]: {
            properties: { firstName: 'Anna', lastName: 'Svensson' },
          },
        })
      );
      fixture.detectChanges();
      expect(component.getCreator()).toBe('Anna Svensson');
    });
  });

  describe('getContributorsList', () => {
    it('returns empty array when no contributors', () => {
      expect(component.getContributorsList()).toEqual([]);
    });

    it('returns list of full names', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.contributors]: [
            { properties: { firstName: 'Anna', lastName: 'Berg' } },
            { properties: { firstName: 'Bo', lastName: 'Carl' } },
          ],
        })
      );
      fixture.detectChanges();
      const names = component.getContributorsList();
      expect(names).toEqual(['Anna Berg', 'Bo Carl']);
    });

    it('filters out empty name entries', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.contributors]: [{}],
        })
      );
      fixture.detectChanges();
      expect(component.getContributorsList()).toEqual([]);
    });
  });

  describe('getStateLabel', () => {
    it('returns document state', () => {
      expect(component.getStateLabel()).toBe('project');
    });

    it('returns em dash when state is null', () => {
      const doc = makeDoc();
      doc.state = undefined;
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.getStateLabel()).toBe('—');
    });
  });

  describe('getVersionLabel', () => {
    it('returns em dash when no version properties', () => {
      expect(component.getVersionLabel()).toBe('—');
    });

    it('returns version string when both major and minor are set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: '1',
          [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: '0',
        })
      );
      fixture.detectChanges();
      expect(component.getVersionLabel()).toBe('1.0');
    });
  });

  describe('getInitials', () => {
    it('returns initials from full name', () => {
      const result = component.getInitials('Anna Svensson');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns bullet placeholder for empty name', () => {
      expect(component.getInitials('')).toBe('•');
    });
  });

  describe('getAuditLabel', () => {
    it('returns eventId from audit entry', () => {
      const entry = makeAuditEntry({ eventId: 'documentCreated', logDate: '2024-01-01' });
      expect(component.getAuditLabel(entry)).toBe('documentCreated');
    });

    it('returns empty string when eventId is null', () => {
      const entry = makeAuditEntry({ eventId: undefined });
      expect(component.getAuditLabel(entry)).toBe('');
    });
  });

  describe('getAuditTime', () => {
    it('formats eventDate', () => {
      const entry = makeAuditEntry({ eventId: 'test', eventDate: '2024-06-15T12:00:00Z', logDate: undefined });
      const result = component.getAuditTime(entry);
      expect(typeof result).toBe('string');
    });
  });

  describe('onTabChanged', () => {
    it('updates activeTabId', () => {
      component.onTabChanged('activity');
      expect(component.activeTabId()).toBe('activity');
    });
  });

  describe('activeTabId signal', () => {
    it('defaults to comments', () => {
      expect(component.activeTabId()).toBe('comments');
    });
  });

  describe('auditEntries signal', () => {
    it('defaults to empty array', () => {
      expect(component.auditEntries()).toEqual([]);
    });
  });

  describe('tagLabels signal', () => {
    it('defaults to empty array when no tags on doc', () => {
      expect(component.tagLabels()).toEqual([]);
    });

    it('extracts string tags from document', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.nxtag.tags]: ['tag1', 'tag2'],
        })
      );
      fixture.detectChanges();
      expect(component.tagLabels()).toEqual(['tag1', 'tag2']);
    });

    it('extracts label from tag objects', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.nxtag.tags]: [{ label: 'urgent' }],
        })
      );
      fixture.detectChanges();
      expect(component.tagLabels()).toContain('urgent');
    });
  });

  describe('addTag', () => {
    it('does nothing when newTagInput is empty', () => {
      component.newTagInput.set('');
      component.addTag();
      expect(apiSpy.tagDocument).not.toHaveBeenCalled();
    });

    it('shows duplicate notification when tag already exists', () => {
      component.tagLabels.set(['existing-tag']);
      component.newTagInput.set('existing-tag');
      component.addTag();
      expect(apiSpy.tagDocument).not.toHaveBeenCalled();
      expect(component.newTagInput()).toBe('');
    });

    it('calls tagDocument for new tags', () => {
      apiSpy.tagDocument.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: { [NUXEO_SCHEMA_FIELDS.nxtag.tags]: ['new-tag'] } as unknown as NuxeoProperties,
          })
        )
      );
      component.tagLabels.set([]);
      component.newTagInput.set('new-tag');
      component.addTag();
      expect(apiSpy.tagDocument).toHaveBeenCalledWith('doc-1', 'new-tag');
    });
  });

  describe('removeTag', () => {
    it('does nothing when tag is empty', () => {
      component.removeTag('');
      expect(apiSpy.untagDocument).not.toHaveBeenCalled();
    });

    it('calls untagDocument for valid tag', () => {
      apiSpy.untagDocument.and.returnValue(
        of(makeNuxeoDocument({ properties: { [NUXEO_SCHEMA_FIELDS.nxtag.tags]: [] } as unknown as NuxeoProperties }))
      );
      component.removeTag('some-tag');
      expect(apiSpy.untagDocument).toHaveBeenCalledWith('doc-1', 'some-tag');
    });
  });

  describe('getNatureLabel', () => {
    it('returns empty string when no nature property', () => {
      expect(component.getNatureLabel()).toBe('');
    });

    it('returns label from properties', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.nature]: { properties: { label: 'Allmän' } },
        })
      );
      fixture.detectChanges();
      expect(component.getNatureLabel()).toBe('Allmän');
    });
  });

  describe('getSubjectLabels', () => {
    it('returns empty array when no subjects', () => {
      expect(component.getSubjectLabels()).toEqual([]);
    });

    it('extracts label from subject items', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.subjects]: [{ properties: { label: 'Education' } }],
        })
      );
      fixture.detectChanges();
      expect(component.getSubjectLabels()).toEqual(['Education']);
    });
  });

  describe('getCoverageLabel', () => {
    it('returns empty string when no coverage', () => {
      expect(component.getCoverageLabel()).toBe('');
    });

    it('returns label when coverage has label', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.coverage]: { properties: { label: 'Stockholm' } },
        })
      );
      fixture.detectChanges();
      expect(component.getCoverageLabel()).toBe('Stockholm');
    });

    it('returns parent/label combined when parent present', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.coverage]: {
            properties: {
              label: 'Södermalm',
              parent: { properties: { label: 'Stockholm' } },
            },
          },
        })
      );
      fixture.detectChanges();
      expect(component.getCoverageLabel()).toBe('Stockholm/Södermalm');
    });
  });

  describe('getFormatLabel', () => {
    it('returns em dash when no format', () => {
      expect(component.getFormatLabel()).toBe('—');
    });

    it('returns mime type from file content', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'application/pdf' },
        })
      );
      fixture.detectChanges();
      expect(component.getFormatLabel()).toBe('application/pdf');
    });
  });

  describe('getEpostmallSubjectLabel', () => {
    it('returns em dash when no subject', () => {
      expect(component.getEpostmallSubjectLabel()).toBe('—');
    });

    it('returns subject text', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.epostmall.amne]: 'Re: Important matter',
        })
      );
      fixture.detectChanges();
      expect(component.getEpostmallSubjectLabel()).toBe('Re: Important matter');
    });
  });

  describe('getUtkastmallProperties', () => {
    it('returns empty array when no egenskaper property', () => {
      expect(component.getUtkastmallProperties()).toEqual([]);
    });

    it('returns mapped properties', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: [
            { nyckel: 'key1', varde: 'value1' },
            { nyckel: 'key2', varde: 'value2' },
          ],
        })
      );
      fixture.detectChanges();
      const result = component.getUtkastmallProperties();
      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ nyckel: 'key1', varde: 'value1' });
    });

    it('filters entries with empty nyckel and varde', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: [{ nyckel: '', varde: '' }],
        })
      );
      fixture.detectChanges();
      expect(component.getUtkastmallProperties()).toEqual([]);
    });
  });

  describe('getArkivMyndighetLabel', () => {
    it('returns empty string when no myndighet', () => {
      expect(component.getArkivMyndighetLabel()).toBe('');
    });

    it('returns title when myndighet has title property', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arkiv.myndighet]: { title: 'Länsstyrelsen' },
        })
      );
      fixture.detectChanges();
      expect(component.getArkivMyndighetLabel()).toBe('Länsstyrelsen');
    });
  });

  describe('downloadOptions computed', () => {
    it('returns download options for the document', () => {
      const opts = component.downloadOptions();
      expect(Array.isArray(opts)).toBeTrue();
    });
  });

  describe('getDocumentAudit called on init', () => {
    it('calls getDocumentAudit with document uid', () => {
      expect(apiSpy.getDocumentAudit).toHaveBeenCalledWith('doc-1', jasmine.anything());
    });
  });

  describe('newTagInput signal', () => {
    it('defaults to empty string', () => {
      expect(component.newTagInput()).toBe('');
    });
  });

  describe('isUploadingAttachments signal', () => {
    it('defaults to false', () => {
      expect(component.isUploadingAttachments()).toBeFalse();
    });
  });

  describe('isDownloadDialogOpen signal', () => {
    it('defaults to false', () => {
      expect(component.isDownloadDialogOpen()).toBeFalse();
    });
  });

  describe('onNewTagInput', () => {
    it('updates newTagInput from event target value', () => {
      const input = document.createElement('input');
      input.value = 'test-tag';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: input });
      component.onNewTagInput(event);
      expect(component.newTagInput()).toBe('test-tag');
    });
  });

  describe('getArkivExportZipName', () => {
    it('returns empty string when no exportZip', () => {
      expect(component.getArkivExportZipName()).toBe('');
    });

    it('returns zip name when present', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arkiv.exportZip]: { name: 'export.zip', length: 1024, blobUrl: '/download/export.zip' },
        })
      );
      fixture.detectChanges();
      expect(component.getArkivExportZipName()).toBe('export.zip');
    });
  });

  describe('getArkivExportZipSize', () => {
    it('returns empty string when no exportZip', () => {
      expect(component.getArkivExportZipSize()).toBe('');
    });

    it('returns formatted size when length is set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arkiv.exportZip]: { name: 'export.zip', length: 1024, blobUrl: '' },
        })
      );
      fixture.detectChanges();
      const size = component.getArkivExportZipSize();
      expect(typeof size).toBe('string');
      expect(size.length).toBeGreaterThan(0);
    });
  });

  describe('isFileDocument for EPostmall', () => {
    it('returns true for EPostmall type', () => {
      const doc = makeDoc();
      doc.type = 'EPostmall';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.isFileDocument()).toBeTrue();
    });
  });

  describe('getFormatLabel for Note document', () => {
    it('returns note mime type for Note documents', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.note.mimeType]: 'text/html' });
      doc.type = 'Note';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.getFormatLabel()).toBe('text/html');
    });

    it('falls back to dc:format for Note when no note mime type', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.format]: 'text/plain' });
      doc.type = 'Note';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.getFormatLabel()).toBe('text/plain');
    });

    it('returns em dash when neither note nor dc format is set for Note', () => {
      const doc = makeDoc();
      doc.type = 'Note';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.getFormatLabel()).toBe('—');
    });
  });

  describe('getArkivExportZipUrl', () => {
    it('returns empty string when no exportZip', () => {
      expect(component.getArkivExportZipUrl()).toBe('');
    });

    it('returns blobUrl when exportZip has blobUrl', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arkiv.exportZip]: {
            name: 'export.zip',
            length: 1024,
            blobUrl: '/download/export.zip',
          },
        })
      );
      fixture.detectChanges();
      expect(component.getArkivExportZipUrl()).toBe('/download/export.zip');
    });
  });

  describe('getVersionLabel with only major version', () => {
    it('returns major version when only major is set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: '2',
        })
      );
      fixture.detectChanges();
      expect(component.getVersionLabel()).toBe('2');
    });

    it('returns em dash when major is empty', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: '',
          [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: '',
        })
      );
      fixture.detectChanges();
      expect(component.getVersionLabel()).toBe('—');
    });
  });

  describe('getNatureLabel fallback to store messages', () => {
    it('returns label from messagesInfo when nature has id', () => {
      storeMock.messagesInfo.set({ 'label.nature.env': 'Miljö' });
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.nature]: { id: 'env' },
        })
      );
      fixture.detectChanges();
      expect(component.getNatureLabel()).toBe('Miljö');
    });

    it('returns empty string when nature id not in messagesInfo', () => {
      storeMock.messagesInfo.set({});
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.nature]: { id: 'unknown' },
        })
      );
      fixture.detectChanges();
      expect(component.getNatureLabel()).toBe('');
    });

    it('returns empty string when nature is null', () => {
      fixture.componentRef.setInput('document', makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.nature]: null }));
      fixture.detectChanges();
      expect(component.getNatureLabel()).toBe('');
    });
  });

  describe('getSubjectLabels with label_en', () => {
    it('prefers label_en over label', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.subjects]: [{ properties: { label_en: 'Education EN', label: 'Utbildning' } }],
        })
      );
      fixture.detectChanges();
      expect(component.getSubjectLabels()).toEqual(['Education EN']);
    });

    it('falls back to label when no label_en', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.subjects]: [{ properties: { label: 'Hälsa' } }],
        })
      );
      fixture.detectChanges();
      expect(component.getSubjectLabels()).toEqual(['Hälsa']);
    });

    it('filters out empty subject labels', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.subjects]: [{ properties: {} }],
        })
      );
      fixture.detectChanges();
      expect(component.getSubjectLabels()).toEqual([]);
    });

    it('handles non-array value by wrapping in array', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.subjects]: { properties: { label: 'Single' } },
        })
      );
      fixture.detectChanges();
      expect(component.getSubjectLabels()).toEqual(['Single']);
    });
  });

  describe('getCoverageLabel with label_en', () => {
    it('prefers label_en over label', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.coverage]: { properties: { label_en: 'Region EN' } },
        })
      );
      fixture.detectChanges();
      expect(component.getCoverageLabel()).toBe('Region EN');
    });

    it('returns parent label_en combined with child label_en', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.coverage]: {
            properties: {
              label_en: 'Södermalm EN',
              parent: { properties: { label_en: 'Stockholm EN' } },
            },
          },
        })
      );
      fixture.detectChanges();
      expect(component.getCoverageLabel()).toBe('Stockholm EN/Södermalm EN');
    });

    it('returns only parent label when child label is absent', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.coverage]: {
            properties: {
              parent: { properties: { label: 'Stockholm' } },
            },
          },
        })
      );
      fixture.detectChanges();
      expect(component.getCoverageLabel()).toBe('Stockholm');
    });

    it('returns empty string when coverage is null', () => {
      fixture.componentRef.setInput('document', makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.coverage]: null }));
      fixture.detectChanges();
      expect(component.getCoverageLabel()).toBe('');
    });
  });

  describe('getArkivMyndighetLabel from signal fallback', () => {
    it('returns title from getDocumentById when myndighet is a uid string', () => {
      const loadedDoc = makeNuxeoDocument({ uid: 'myndighet-uid', title: 'Myndigheten' });
      apiSpy.getDocumentById.and.returnValue(of(loadedDoc));
      fixture.componentRef.setInput('document', makeDoc({ [NUXEO_SCHEMA_FIELDS.arkiv.myndighet]: 'myndighet-uid' }));
      fixture.detectChanges();
      expect(component.getArkivMyndighetLabel()).toBe('Myndigheten');
    });

    it('falls back to uid string when getDocumentById fails', () => {
      apiSpy.getDocumentById.and.returnValue(throwError(() => new Error('fail')));
      fixture.componentRef.setInput('document', makeDoc({ [NUXEO_SCHEMA_FIELDS.arkiv.myndighet]: 'fallback-uid' }));
      fixture.detectChanges();
      expect(component.getArkivMyndighetLabel()).toBe('fallback-uid');
    });
  });

  describe('addTag error branch', () => {
    it('sets notification to danger on tag API error', () => {
      apiSpy.tagDocument.and.returnValue(throwError(() => new Error('fail')));
      component.tagLabels.set([]);
      component.newTagInput.set('error-tag');
      component.addTag();
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('emits reloadDocument on successful addTag', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      fixture.componentInstance.reloadDocument.subscribe(reloadSpy);
      apiSpy.tagDocument.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: { [NUXEO_SCHEMA_FIELDS.nxtag.tags]: ['new-tag'] } as unknown as NuxeoProperties,
          })
        )
      );
      component.tagLabels.set([]);
      component.newTagInput.set('new-tag');
      component.addTag();
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('removeTag error branch', () => {
    it('sets notification to danger on untag API error', () => {
      apiSpy.untagDocument.and.returnValue(throwError(() => new Error('fail')));
      component.removeTag('some-tag');
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('emits reloadDocument on successful removeTag', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      fixture.componentInstance.reloadDocument.subscribe(reloadSpy);
      apiSpy.untagDocument.and.returnValue(
        of(makeNuxeoDocument({ properties: { [NUXEO_SCHEMA_FIELDS.nxtag.tags]: [] } as unknown as NuxeoProperties }))
      );
      component.removeTag('some-tag');
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('deleteNoteAttachment', () => {
    it('removes attachment from list and emits reloadDocument on success', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      fixture.componentInstance.reloadDocument.subscribe(reloadSpy);
      (apiSpy.deleteAttachment as jasmine.Spy).and.returnValue(of(undefined));
      component.deleteNoteAttachment(0);
      expect(apiSpy.deleteAttachment).toHaveBeenCalledWith(0, 'doc-1');
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('shows danger notification on delete error', () => {
      (apiSpy.deleteAttachment as jasmine.Spy).and.returnValue(throwError(() => new Error('fail')));
      component.deleteNoteAttachment(0);
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });
  });

  describe('openNoteAttachment', () => {
    it('does nothing when attachment has no inlineUrl', () => {
      const attachment = {
        id: 'att-1',
        title: 'file.pdf',
        typeLabel: 'bilaga',
        mimeType: 'application/pdf',
        fileKind: 'pdf' as const,
        blobUrl: '',
        inlineUrl: '',
        downloadUrl: '',
      };
      component.openNoteAttachment(attachment);
      expect(apiSpy.getDocumentById).not.toHaveBeenCalled();
    });

    it('fetches doc and sets previewDoc when fileDocId is present', () => {
      const previewDoc = makeNuxeoDocument({ uid: 'file-doc-id' });
      apiSpy.getDocumentById.and.returnValue(of(previewDoc));
      const attachment = {
        id: 'att-1',
        title: 'file.pdf',
        typeLabel: 'bilaga',
        mimeType: 'application/pdf',
        fileKind: 'pdf' as const,
        fileDocId: 'file-doc-id',
        blobUrl: '/some/url',
        inlineUrl: '/some/url?inline=true',
        downloadUrl: '/some/url',
      };
      component.openNoteAttachment(attachment);
      expect(apiSpy.getDocumentById).toHaveBeenCalledWith('file-doc-id', true);
      expect(component.previewDoc()).toEqual(previewDoc);
    });

    it('sets previewDoc to null on getDocumentById error', () => {
      apiSpy.getDocumentById.and.returnValue(throwError(() => new Error('fail')));
      const attachment = {
        id: 'att-1',
        title: 'file.pdf',
        typeLabel: 'bilaga',
        mimeType: 'application/pdf',
        fileKind: 'pdf' as const,
        fileDocId: 'file-doc-id',
        blobUrl: '/some/url',
        inlineUrl: '/some/url?inline=true',
        downloadUrl: '/some/url',
      };
      component.openNoteAttachment(attachment);
      expect(component.previewDoc()).toBeNull();
      expect(component.previewAttachment()).toEqual(attachment);
    });

    it('sets previewAttachment without loading doc when no fileDocId', () => {
      const attachment = {
        id: 'att-1',
        title: 'file.pdf',
        typeLabel: 'bilaga',
        mimeType: 'application/pdf',
        fileKind: 'pdf' as const,
        blobUrl: '/some/url',
        inlineUrl: '/some/url?inline=true',
        downloadUrl: '/some/url',
      };
      component.openNoteAttachment(attachment);
      expect(apiSpy.getDocumentById).not.toHaveBeenCalled();
      expect(component.previewAttachment()).toEqual(attachment);
    });
  });

  describe('triggerReplaceAttachment', () => {
    it('sets replaceAttachmentIndex signal', () => {
      component.triggerReplaceAttachment(2);
      expect(component.replaceAttachmentIndex()).toBe(2);
    });
  });

  describe('onReplaceFileSelected', () => {
    it('does nothing when no file in event', () => {
      const event = new Event('change');
      Object.defineProperty(event, 'target', { value: { files: {} } });
      component.replaceAttachmentIndex.set(0);
      component.onReplaceFileSelected(event);
      expect(apiSpy.initializeUpload).not.toHaveBeenCalled();
    });

    it('does nothing when replaceAttachmentIndex is null', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const event = new Event('change');
      Object.defineProperty(event, 'target', { value: { files: { 0: file } } });
      component.replaceAttachmentIndex.set(null);
      component.onReplaceFileSelected(event);
      expect(apiSpy.initializeUpload).not.toHaveBeenCalled();
    });
  });

  describe('onAttachmentFilesChange', () => {
    function makeUploadedFile(id: string, name: string): UploadedFile {
      const f = new File([], name);
      return Object.assign(f, { id }) as UploadedFile;
    }

    it('does nothing when files array is empty', () => {
      component.onAttachmentFilesChange([]);
      expect(apiSpy.initializeUpload).not.toHaveBeenCalled();
    });

    it('does nothing for files already uploaded', () => {
      const file = makeUploadedFile('file-1', 'doc.pdf');

      apiSpy.initializeUpload.and.returnValue(of({ batchId: 'b1' }));
      apiSpy.uploadFile.and.returnValue(of({}));
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.onAttachmentFilesChange([file]);

      const callsBefore = (apiSpy.initializeUpload as jasmine.Spy).calls.count();
      component.onAttachmentFilesChange([file]);
      expect((apiSpy.initializeUpload as jasmine.Spy).calls.count()).toBe(callsBefore);
    });

    it('initiates upload for new files', () => {
      const file = makeUploadedFile('file-new', 'new.pdf');
      apiSpy.initializeUpload.and.returnValue(of({ batchId: 'b1' }));
      apiSpy.uploadFile.and.returnValue(of({}));
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.onAttachmentFilesChange([file]);
      expect(apiSpy.initializeUpload).toHaveBeenCalled();
    });

    it('shows danger notification on upload error', () => {
      const file = makeUploadedFile('file-err', 'err.pdf');
      apiSpy.initializeUpload.and.returnValue(throwError(() => new Error('upload fail')));
      component.onAttachmentFilesChange([file]);
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });
  });

  describe('syncAttachments via document with Folderish facet', () => {
    it('loads attachment documents when document is Folderish and has no file entries', () => {
      const folderishDoc = makeNuxeoDocument({
        uid: 'folder-1',
        facets: ['Folderish'],
        properties: {
          [NUXEO_SCHEMA_FIELDS.files.files]: [],
          [NUXEO_SCHEMA_FIELDS.arkiv.myndighet]: '',
          [NUXEO_SCHEMA_FIELDS.nxtag.tags]: [],
          [NUXEO_SCHEMA_FIELDS.dc.creator]: null,
          [NUXEO_SCHEMA_FIELDS.dc.contributors]: [],
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'Folder',
        } as unknown as NuxeoProperties,
      });
      (apiSpy.getEntriesForParentPath as jasmine.Spy).and.returnValue(of({ entries: [] }));
      fixture.componentRef.setInput('document', folderishDoc);
      fixture.detectChanges();
      expect(apiSpy.getEntriesForParentPath).toHaveBeenCalledWith('folder-1');
    });

    it('sets noteAttachments when document has files:files entries', () => {
      const docWithFiles = makeNuxeoDocument({
        uid: 'doc-with-files',
        facets: [],
        properties: {
          [NUXEO_SCHEMA_FIELDS.files.files]: [
            { file: { name: 'attachment.pdf', 'mime-type': 'application/pdf', blobUrl: '/path/to/file' } },
          ],
          [NUXEO_SCHEMA_FIELDS.arkiv.myndighet]: '',
          [NUXEO_SCHEMA_FIELDS.nxtag.tags]: [],
          [NUXEO_SCHEMA_FIELDS.dc.creator]: null,
          [NUXEO_SCHEMA_FIELDS.dc.contributors]: [],
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'Doc',
        } as unknown as NuxeoProperties,
      });
      fixture.componentRef.setInput('document', docWithFiles);
      fixture.detectChanges();
      expect(component.noteAttachments().length).toBe(1);
      expect(component.noteAttachments()[0]['title']).toBe('attachment.pdf');
    });
  });

  describe('showAttachments input false', () => {
    it('clears attachments when showAttachments is false', () => {
      fixture.componentRef.setInput('showAttachments', false);
      fixture.detectChanges();
      expect(component.noteAttachments()).toEqual([]);
      expect(component.attachments()).toEqual([]);
    });
  });

  describe('auditEntries loaded on init', () => {
    it('sets auditEntries from API response', () => {
      const entry = makeAuditEntry({ eventId: 'documentModified', logDate: '2024-06-01' });
      apiSpy.getDocumentAudit.and.returnValue(of(makeAuditLogEntries({ entries: [entry] })));
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();

      expect(Array.isArray(component.auditEntries())).toBeTrue();
    });

    it('sets empty array and auditError on audit API error', async () => {
      apiSpy.getDocumentAudit.and.returnValue(throwError(() => new Error('audit fail')));

      const newFixture = TestBed.createComponent(DocumentInfoPanelComponent);
      newFixture.componentRef.setInput('document', makeDoc());
      newFixture.detectChanges();
      expect(newFixture.componentInstance.auditEntries()).toEqual([]);
    });
  });

  describe('getAuditTime fallback to logDate', () => {
    it('uses logDate when eventDate is not set', () => {
      const entry = makeAuditEntry({ eventDate: undefined, logDate: '2024-03-15T10:00:00Z' });
      const result = component.getAuditTime(entry);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getDate array with multiple elements', () => {
    it('uses first element of array', () => {
      const result1 = component.getDate(['2024-01-01', '2024-12-31']);
      const result2 = component.getDate(['2024-01-01']);
      expect(result1).toBe(result2);
    });
  });

  describe('getCreator with user.firstName and user.lastName fields', () => {
    it('returns name using alternative property keys', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.creator]: {
            properties: {
              [NUXEO_SCHEMA_FIELDS.user.firstName]: 'Erik',
              [NUXEO_SCHEMA_FIELDS.user.lastName]: 'Nilsson',
            },
          },
        })
      );
      fixture.detectChanges();

      const result = component.getCreator();
      expect(typeof result).toBe('string');
    });
  });

  describe('tagLabels with value property in tag objects', () => {
    it('extracts value when label is absent from tag object', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.nxtag.tags]: [{ value: 'my-value' }],
        })
      );
      fixture.detectChanges();
      expect(component.tagLabels()).toContain('my-value');
    });

    it('deduplicates tag labels', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.nxtag.tags]: ['dup', 'dup', 'unique'],
        })
      );
      fixture.detectChanges();
      const tags = component.tagLabels();
      expect(tags.filter(t => t === 'dup').length).toBe(1);
      expect(tags).toContain('unique');
    });
  });

  describe('getUtkastmallProperties edge cases', () => {
    it('includes entry with only nyckel set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: [{ nyckel: 'mykey', varde: '' }],
        })
      );
      fixture.detectChanges();
      const result = component.getUtkastmallProperties();
      expect(result.length).toBe(1);
      expect(result[0].nyckel).toBe('mykey');
    });

    it('includes entry with only varde set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: [{ nyckel: '', varde: 'myvalue' }],
        })
      );
      fixture.detectChanges();
      const result = component.getUtkastmallProperties();
      expect(result.length).toBe(1);
      expect(result[0].varde).toBe('myvalue');
    });

    it('returns empty array for non-array value', () => {
      fixture.componentRef.setInput('document', makeDoc({ [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: null }));
      fixture.detectChanges();
      expect(component.getUtkastmallProperties()).toEqual([]);
    });
  });

  describe('loadAttachmentDocuments error handling', () => {
    it('shows danger notification when getEntriesForParentPath fails', () => {
      (apiSpy.getEntriesForParentPath as jasmine.Spy).and.returnValue(throwError(() => new Error('load fail')));
      const folderishDoc = makeNuxeoDocument({
        uid: 'folder-err',
        facets: ['Folderish'],
        properties: {
          [NUXEO_SCHEMA_FIELDS.files.files]: [],
          [NUXEO_SCHEMA_FIELDS.arkiv.myndighet]: '',
          [NUXEO_SCHEMA_FIELDS.nxtag.tags]: [],
          [NUXEO_SCHEMA_FIELDS.dc.creator]: null,
          [NUXEO_SCHEMA_FIELDS.dc.contributors]: [],
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'Folder',
        } as unknown as NuxeoProperties,
      });
      fixture.componentRef.setInput('document', folderishDoc);
      fixture.detectChanges();
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });
  });
});
