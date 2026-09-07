import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateHandlingFormComponent } from './create-handling-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { LagrumFieldService } from '@app/shared/services/lagrum-field.service';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

function makeArendeDoc(overrides: Record<string, unknown> = {}) {
  return makeNuxeoDocument({
    uid: 'arende-1',
    type: 'Arende',
    path: '/statlig-myndighet/workspaces/case-1',
    title: 'Test Arende',
    properties: {
      [NUXEO_SCHEMA_FIELDS.arende.motpart]: null,
      [NUXEO_SCHEMA_FIELDS.arende.riktning]: null,
      [NUXEO_SCHEMA_FIELDS.arende.sekretess]: null,
      ...overrides,
    },
  });
}

function makeUploadedFile(name: string, id = 'f1'): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

describe('CreateHandlingFormComponent', () => {
  let component: CreateHandlingFormComponent;
  let fixture: ComponentFixture<CreateHandlingFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let formUtilsSpy: jasmine.SpyObj<FormUtilsService>;
  let lagrumSpy: jasmine.SpyObj<LagrumFieldService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectorySuggestions',
      'getDocumentById',
      'getEmptyWithDefaults',
      'DMSDocumentSuggestion',
      'getLagrumOptions',
      'initializeUpload',
      'uploadFile',
      'createDocument',
      'attachFile',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));
    apiSpy.getDocumentById.and.returnValue(of(makeArendeDoc()));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(makeNuxeoDocument({ uid: 'empty-1' })));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.getLagrumOptions.and.returnValue(of([]));
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-123' }));
    apiSpy.uploadFile.and.returnValue(of({}));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'new-doc-1', title: 'Created' })));
    apiSpy.attachFile.and.returnValue(of(makeNuxeoDocument()));

    formUtilsSpy = jasmine.createSpyObj('FormUtilsService', ['hasStrongSecrecy']);
    formUtilsSpy.hasStrongSecrecy.and.returnValue(false);

    lagrumSpy = jasmine.createSpyObj('LagrumFieldService', ['buildField', 'syncOptions', 'removeField']);
    lagrumSpy.buildField.and.returnValue({ type: 'dropdown', name: 'lagrum', label: 'Lagrum', options: [] });
    lagrumSpy.syncOptions.and.callFake((config: FieldConfig[]) => config);
    lagrumSpy.removeField.and.callFake((config: FieldConfig[]) => config.filter(c => c.name !== 'lagrum'));

    await TestBed.configureTestingModule({
      imports: [CreateHandlingFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: FormUtilsService, useValue: formUtilsSpy },
        { provide: LagrumFieldService, useValue: lagrumSpy },
      ],
    })
      .overrideTemplate(CreateHandlingFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateHandlingFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parentUid', 'arende-1');
    fixture.componentRef.setInput('path', '/default-domain/workspaces/case-1');
    fixture.componentRef.setInput('itemType', 'Handling');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit API calls', () => {
    it('calls getDocumentById with parentUid', () => {
      expect(apiSpy.getDocumentById).toHaveBeenCalledWith('arende-1');
    });

    it('calls getEmptyWithDefaults with path and itemType', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/default-domain/workspaces/case-1', 'Handling');
    });

    it('calls DMSDocumentSuggestion for handling types', () => {
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('arende-1', 'Handlingstyp', 'Handling', '');
    });

    it('does not fetch the scoped default lookup when the case has no arendetyp, but still fetches the picklist', () => {
      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalledWith(
        'arende-1',
        'Lagrum',
        'Handling',
        '',
        jasmine.anything()
      );
      expect(apiSpy.getLagrumOptions).toHaveBeenCalledWith('arende-1');
      expect(component.lagrumOptions()).toEqual([]);
    });

    it('uses the scoped call only for the default pre-selection, and the unscoped call for the full dropdown', () => {
      formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
      apiSpy.getDocumentById.and.returnValue(
        of(
          makeArendeDoc({
            [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: { uid: 'klass-1' },
            [NUXEO_SCHEMA_FIELDS.arende.sekretess]: { id: 'svag-1' },
          })
        )
      );
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'lag-1', title: 'Lagrum 1' })] }))
      );
      apiSpy.getLagrumOptions.and.returnValue(
        of([
          { label: 'Lagrum 1', id: 'lag-1' },
          { label: 'Lagrum 2', id: 'lag-2' },
        ])
      );

      const newFixture = TestBed.createComponent(CreateHandlingFormComponent);
      newFixture.componentRef.setInput('parentUid', 'arende-1');
      newFixture.componentRef.setInput('path', '/default-domain/workspaces/case-1');
      newFixture.componentRef.setInput('itemType', 'Handling');
      newFixture.detectChanges();

      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('arende-1', 'Lagrum', 'Handling', '', {
        selectedKlass: 'klass-1',
      });
      expect(apiSpy.getLagrumOptions).toHaveBeenCalledWith('arende-1');
      expect(newFixture.componentInstance.lagrumOptions()).toEqual([
        { label: 'Lagrum 1', id: 'lag-1' },
        { label: 'Lagrum 2', id: 'lag-2' },
      ]);
      expect(newFixture.componentInstance.createHandlingConfig().find(f => f.name === 'lagrum')?.defaultValue).toEqual([
        { label: 'Lagrum 1', id: 'lag-1' },
      ]);
    });

    it('pre-selects only the first Lagrum when the klass has more than one configured ref', () => {
      // Regression: passing the full multi-entry array as defaultValue to a
      // single-select dropdown left it showing no selection at all.
      formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
      apiSpy.getDocumentById.and.returnValue(
        of(
          makeArendeDoc({
            [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: { uid: 'klass-1' },
            [NUXEO_SCHEMA_FIELDS.arende.sekretess]: { id: 'svag-1' },
          })
        )
      );
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeNuxeoDocument({ uid: 'lag-1', title: 'Lagrum 1' }),
              makeNuxeoDocument({ uid: 'lag-2', title: 'Lagrum 2' }),
            ],
          })
        )
      );

      const newFixture = TestBed.createComponent(CreateHandlingFormComponent);
      newFixture.componentRef.setInput('parentUid', 'arende-1');
      newFixture.componentRef.setInput('path', '/default-domain/workspaces/case-1');
      newFixture.componentRef.setInput('itemType', 'Handling');
      newFixture.detectChanges();

      expect(newFixture.componentInstance.createHandlingConfig().find(f => f.name === 'lagrum')?.defaultValue).toEqual([
        { label: 'Lagrum 1', id: 'lag-1' },
      ]);
    });

    it('calls getDirectorySuggestions for Riktning, Sekretess, MotpartTyp', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Riktning');
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Sekretess');
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('MotpartTyp');
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('caseDirections defaults to empty array', () => {
      expect(component.caseDirections()).toEqual([]);
    });

    it('arendeMotpart defaults to null', () => {
      expect(component.arendeMotpart()).toBeNull();
    });

    it('stateAgency set from arende path', () => {
      expect(component.stateAgency()).toBe('statlig-myndighet');
    });

    it('currentRiktning defaults to intern', () => {
      expect(component.currentRiktning()).toBe(NUXEO_VOCAB_IDS.arendeRiktning.intern);
    });

    it('motpartRadioValue defaults to null (no motpart options)', () => {
      expect(component.motpartRadioValue()).toBeNull();
    });

    it('avsandareSource defaults to default', () => {
      expect(component.avsandareSource()).toBe('default');
    });

    it('mottagareSource defaults to default', () => {
      expect(component.mottagareSource()).toBe('default');
    });

    it('defaultPayload set after getEmptyWithDefaults', () => {
      expect(component.defaultPayload()).toBeTruthy();
    });
  });

  describe('getRiktningDefaultValue', () => {
    it('maps "in" to inkommande', () => {
      expect(component.getRiktningDefaultValue('in')).toBe(NUXEO_VOCAB_IDS.arendeRiktning.inkommande);
    });

    it('maps "ut" to utgaende', () => {
      expect(component.getRiktningDefaultValue('ut')).toBe(NUXEO_VOCAB_IDS.arendeRiktning.utgaende);
    });

    it('maps unknown to intern', () => {
      expect(component.getRiktningDefaultValue('other')).toBe(NUXEO_VOCAB_IDS.arendeRiktning.intern);
    });

    it('maps null to intern', () => {
      expect(component.getRiktningDefaultValue(null)).toBe(NUXEO_VOCAB_IDS.arendeRiktning.intern);
    });
  });

  describe('removeExtension', () => {
    it('removes .pdf extension', () => {
      expect(component.removeExtension('document.pdf')).toBe('document');
    });

    it('removes .docx extension', () => {
      expect(component.removeExtension('my-file.docx')).toBe('my-file');
    });

    it('returns name unchanged for no extension', () => {
      expect(component.removeExtension('filename')).toBe('filename');
    });

    it('removes only the last extension', () => {
      expect(component.removeExtension('archive.tar.gz')).toBe('archive.tar');
    });
  });

  describe('onDropdownInputChange', () => {
    it('calls getHandlingType when type changes', () => {
      apiSpy.DMSDocumentSuggestion.calls.reset();
      component.onDropdownInputChange({ fieldName: 'type', value: 'handling-type-1' });
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith(
        'arende-1',
        'Handlingstyp',
        'Handling',
        'handling-type-1'
      );
    });

    it('updates template value via keepTempleteSelectedValue', () => {
      const initial = component.createHandlingConfig();
      component.createHandlingConfig.set([...initial, { type: 'uploadFile', name: 'uploadFile', label: 'Upload' }]);
      component.onDropdownInputChange({
        fieldName: 'type',
        value: 'type-1',
        formValue: { template: 'template-uid-1' },
      });
      const uploadField = component.createHandlingConfig().find(f => f.name === 'uploadFile');
      expect(uploadField?.defaultValue).toBe('template-uid-1');
    });

    it('does nothing for non-type fieldName', () => {
      apiSpy.DMSDocumentSuggestion.calls.reset();
      component.onDropdownInputChange({ fieldName: 'name', value: 'something' });
      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    });
  });

  describe('selectedOptionChanged', () => {
    it('updates lagrum visibility when secret changes to strong secrecy', () => {
      formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
      component.createHandlingConfig.set([{ type: 'dropdown', name: 'secret', label: 'Sekretess' }]);
      component.selectedOptionChanged({ fieldName: 'secret', selectedValue: 'starkSekretess' });
      expect(lagrumSpy.buildField).toHaveBeenCalled();
    });

    it('removes lagrum when secret changes to no secrecy', () => {
      formUtilsSpy.hasStrongSecrecy.and.returnValue(false);
      component.createHandlingConfig.set([
        { type: 'dropdown', name: 'secret', label: 'Sekretess' },
        { type: 'dropdown', name: 'lagrum', label: 'Lagrum' },
      ]);
      component.selectedOptionChanged({ fieldName: 'secret', selectedValue: 'ingenSekretess' });
      expect(lagrumSpy.removeField).toHaveBeenCalled();
    });

    it('updates currentRiktning and removes contact fields when riktning changes to intern', () => {
      component.createHandlingConfig.set([
        { type: 'radio', name: 'riktning', label: 'Riktning' },
        { type: 'text', name: 'defaultAvsandare', label: 'Default Avsändare' },
        { type: 'text', name: 'defaultMotpart', label: 'Default Motpart' },
      ]);
      component.selectedOptionChanged({
        fieldName: 'riktning',
        selectedValue: NUXEO_VOCAB_IDS.arendeRiktning.intern,
      });
      expect(component.currentRiktning()).toBe(NUXEO_VOCAB_IDS.arendeRiktning.intern);
      const config = component.createHandlingConfig();
      expect(config.some(f => f.name === 'defaultAvsandare')).toBeFalse();
    });

    it('inserts contact fields when riktning is not intern', () => {
      component.createHandlingConfig.set([{ type: 'radio', name: 'riktning', label: 'Riktning' }]);
      component.selectedOptionChanged({
        fieldName: 'riktning',
        selectedValue: NUXEO_VOCAB_IDS.arendeRiktning.utgaende,
      });
      expect(component.currentRiktning()).toBe(NUXEO_VOCAB_IDS.arendeRiktning.utgaende);
      const config = component.createHandlingConfig();
      expect(config.some(f => f.name === 'avsandareSource')).toBeTrue();
    });

    it('sets motpartRadioValue for motpartRadio field', () => {
      component.selectedOptionChanged({ fieldName: 'motpartRadio', selectedValue: 'foretagMyndighet' });
      expect(component.motpartRadioValue()).toBe('foretagMyndighet');
    });

    it('sets avsandareSource to custom when avsandare-custom selected', () => {
      component.createHandlingConfig.set([]);
      component.selectedOptionChanged({ fieldName: 'avsandareSource', selectedValue: 'avsandare-custom' });
      expect(component.avsandareSource()).toBe('custom');
    });

    it('sets avsandareSource to default when non-custom selected', () => {
      component.avsandareSource.set('custom');
      component.createHandlingConfig.set([]);
      component.selectedOptionChanged({ fieldName: 'avsandareSource', selectedValue: 'avsandare-default' });
      expect(component.avsandareSource()).toBe('default');
    });

    it('sets mottagareSource to custom when mottagare-custom selected', () => {
      component.createHandlingConfig.set([]);
      component.selectedOptionChanged({ fieldName: 'mottagareSource', selectedValue: 'mottagare-custom' });
      expect(component.mottagareSource()).toBe('custom');
    });
  });

  describe('uploadFile', () => {
    it('clears config rubrik when file list is empty', () => {
      component.createHandlingConfig.set([
        { type: 'input', name: 'rubrik', label: 'Rubrik', defaultValue: 'old-name' },
        { type: 'uploadFile', name: 'uploadFile', label: 'Upload' },
      ]);
      component.uploadFile([]);
      const rubrik = component.createHandlingConfig().find(f => f.name === 'rubrik');
      expect(rubrik?.defaultValue).toBe('');
      expect(component.fileBatchId).toBe('');
    });

    it('updates rubrik and name with filename when file uploaded', () => {
      component.createHandlingConfig.set([
        { type: 'input', name: 'rubrik', label: 'Rubrik', defaultValue: '' },
        { type: 'textarea', name: 'name', label: 'Name', defaultValue: '' },
      ]);
      component.uploadFile([makeUploadedFile('report.pdf')]);
      const rubrik = component.createHandlingConfig().find(f => f.name === 'rubrik');
      expect(rubrik?.defaultValue).toBe('report');
    });

    it('calls initializeUpload and uploadFile', () => {
      component.createHandlingConfig.set([{ type: 'uploadFile', name: 'uploadFile', label: 'Upload' }]);
      component.uploadFile([makeUploadedFile('doc.pdf')]);
      expect(apiSpy.initializeUpload).toHaveBeenCalled();
      expect(apiSpy.uploadFile).toHaveBeenCalled();
    });

    it('adds attachments field after first upload', () => {
      component.createHandlingConfig.set([{ type: 'uploadFile', name: 'uploadFile', label: 'Upload' }]);
      apiSpy.uploadFile.and.returnValue(of({}));
      component.uploadFile([makeUploadedFile('file.pdf')]);
      const hasAttachments = component.createHandlingConfig().some(f => f.name === 'attachments');
      expect(hasAttachments).toBeTrue();
    });
  });

  describe('keepTempleteSelectedValue', () => {
    it('sets defaultValue of uploadFile field to template uid', () => {
      component.createHandlingConfig.set([{ type: 'uploadFile', name: 'uploadFile', label: 'Upload' }]);
      component.keepTempleteSelectedValue('template-uid-99');
      const uploadField = component.createHandlingConfig().find(f => f.name === 'uploadFile');
      expect(uploadField?.defaultValue).toBe('template-uid-99');
    });

    it('does nothing when no uploadFile field', () => {
      component.createHandlingConfig.set([{ type: 'input', name: 'other', label: 'Other' }]);
      expect(() => component.keepTempleteSelectedValue('uid')).not.toThrow();
    });
  });

  describe('onFileUpload', () => {
    it('delegates to uploadFile for uploadFile fieldName', () => {
      const spy = spyOn(component, 'uploadFile');
      component.onFileUpload({ files: [], fieldName: 'uploadFile' });
      expect(spy).toHaveBeenCalledWith([]);
    });

    it('delegates to uploadAttachments for attachments fieldName', () => {
      const spy = spyOn(component, 'uploadAttachments');
      component.onFileUpload({ files: [], fieldName: 'attachments' });
      expect(spy).toHaveBeenCalledWith([]);
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload.set(null);
      expect(() =>
        component.createDocument({
          handlingFormat: 'paper',
          type: [{ id: 'type-1' }],
          name: 'Test',
          riktning: NUXEO_VOCAB_IDS.arendeRiktning.intern,
        })
      ).toThrow();
    });

    it('calls createDocument API with payload', () => {
      component.defaultPayload.set(makeNuxeoDocument({ uid: 'empty-1' }));
      component.fileBatchId = 'batch-1';
      component.createDocument({
        handlingFormat: 'digital',
        type: [{ id: 'type-1' }],
        name: 'My Document',
        rubrik: 'Rubrik',
        riktning: NUXEO_VOCAB_IDS.arendeRiktning.intern,
        dateFrom: [new Date('2024-06-15')],
        personuppgifter: false,
        secret: '',
        avsandare: [],
        mottagare: [],
        template: '',
        defaultMotpart: '',
      });

      expect(apiSpy.createDocument).toHaveBeenCalled();
    });

    it('emits dialogClosed with created doc on success', () => {
      const emitted: unknown[] = [];
      component.dialogClosed.subscribe(v => emitted.push(v));
      component.defaultPayload.set(makeNuxeoDocument({ uid: 'empty-1' }));
      component.fileBatchId = '';

      component.createDocument({
        handlingFormat: 'paper',
        type: [{ id: 'type-1' }],
        name: 'Paper Doc',
        rubrik: 'Rubrik',
        riktning: NUXEO_VOCAB_IDS.arendeRiktning.intern,
        dateFrom: [new Date('2024-06-15')],
        personuppgifter: false,
        secret: '',
        avsandare: [],
        mottagare: [],
        template: '',
        defaultMotpart: '',
      });

      expect(emitted.length).toBe(1);
      expect((emitted[0] as NuxeoDocument)?.uid).toBe('new-doc-1');
    });
  });

  describe('typeOptions signal', () => {
    it('defaults to empty array', () => {
      expect(component.typeOptions()).toEqual([]);
    });

    it('populated from DMSDocumentSuggestion response', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'type-1', title: 'Type 1', path: '/types/1' })] }))
      );
      component.getHandlingType('');
      expect(component.typeOptions().length).toBe(1);
      expect(component.typeOptions()[0].id).toBe('type-1');
    });
  });

  describe('createHandlingConfig signal', () => {
    it('defaults to empty array', () => {
      const comp = TestBed.createComponent(CreateHandlingFormComponent).componentInstance;
      expect(comp.createHandlingConfig()).toEqual([]);
    });
  });
});
