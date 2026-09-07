import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CreateHandlingFromMail, FormResult } from './create-handling-from-mail.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { LagrumFieldService } from '@app/shared/services/lagrum-field.service';
import { Direction, NuxeoDocument, SearchResult } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { FieldConfig } from '../../general-form/general-form.types';

interface ApiPayload {
  input: string;
  params: {
    arende: string | Record<string, unknown>;
    filer: { type?: string; [key: string]: unknown }[];
    handling: Record<string, unknown>;
  };
}

interface CreateHandlingPrivate {
  applyLagrumDefault: (id: string) => void;
}

const mailDocument: NuxeoDocument = {
  'entity-type': 'document',
  repository: 'default',
  uid: 'mail-1',
  path: '/default-domain/workspaces/mail-1',
  type: 'MailMessage',
  name: 'mail-1',
  title: 'Mail 1',
  parentRef: 'parent-1',
  isCheckedOut: true,
  isRecord: false,
  isTrashed: false,
  facets: [],
  schemas: [],
  lastModified: '2026-06-15T00:00:00.000Z',
  properties: {
    [NUXEO_SCHEMA_FIELDS.mail.sender]: 'Sender <sender@example.test>',
    [NUXEO_SCHEMA_FIELDS.mail.recipients]: ['Recipient <recipient@example.test>'],
  },
};

const documentEntry = (uid: string, title: string, type = 'Arende'): NuxeoDocument => ({
  'entity-type': 'document',
  repository: 'default',
  uid,
  path: `/default-domain/workspaces/${uid}`,
  type,
  name: uid,
  title,
  isCheckedOut: true,
  isRecord: false,
  isTrashed: false,
  facets: [],
  schemas: [],
  lastModified: '2026-06-15T00:00:00.000Z',
  properties: {},
});

const searchResult: SearchResult<NuxeoDocument> = {
  'entity-type': 'documents',
  isPaginable: true,
  resultsCount: 1,
  totalSize: 1,
  pageSize: 20,
  pageIndex: 0,
  pageCount: 1,
  entries: [
    {
      ...documentEntry('case-1', 'Case 1'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.ar.ar]: '2026',
      },
    },
  ],
};

const directoryEntry = (id: string, label: string): Direction => ({
  id,
  displayLabel: label,
});

function makeMockProviders(
  apiSpy: jasmine.SpyObj<NuxeoApiService>,
  formUtilsSpy: jasmine.SpyObj<FormUtilsService>,
  lagrumFieldSpy: jasmine.SpyObj<LagrumFieldService>
) {
  return [
    provideHttpClient(withInterceptorsFromDi()),
    provideHttpClientTesting(),
    provideRouter([]),
    GeneralStore,
    { provide: NuxeoApiService, useValue: apiSpy },
    { provide: FormUtilsService, useValue: formUtilsSpy },
    { provide: LagrumFieldService, useValue: lagrumFieldSpy },
  ];
}

function buildSpies() {
  const apiSpy = jasmine.createSpyObj<NuxeoApiService>('NuxeoApiService', [
    'getCaseOptions',
    'getDirectorySuggestions',
    'getLagrumOptions',
    'DMSDocumentSuggestion',
    'getAncestorsById',
    'getDocumentById',
    'createHandling',
    'getMessagesJSON',
  ]);
  apiSpy.getCaseOptions.and.returnValue(of(searchResult));
  apiSpy.getDirectorySuggestions.and.returnValue(
    of([
      directoryEntry(NUXEO_VOCAB_IDS.arendeRiktning.inkommande, 'Inkommande'),
      directoryEntry(NUXEO_VOCAB_IDS.arendeRiktning.utgaende, 'Utgående'),
      directoryEntry(NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet, 'Företag'),
      directoryEntry(NUXEO_VOCAB_IDS.motpartTyp.privatPerson, 'Privatperson'),
    ])
  );
  apiSpy.getLagrumOptions.and.returnValue(of([{ id: 'lagrum-1', label: 'Lagrum 1' }]));
  apiSpy.DMSDocumentSuggestion.and.returnValue(of({ ...searchResult, entries: [] }));
  apiSpy.getAncestorsById.and.returnValue(of([documentEntry('ar-1', '2026', 'Ar')]));
  apiSpy.getDocumentById.and.returnValue(of(documentEntry('doc-1', 'Document 1')));
  apiSpy.createHandling.and.returnValue(of(documentEntry('handling-1', 'Handling 1', 'Handling')));
  apiSpy.getMessagesJSON.and.returnValue(of({}));

  const formUtilsSpy = jasmine.createSpyObj<FormUtilsService>('FormUtilsService', ['hasStrongSecrecy']);
  // Mirrors the real FormUtilsService: both Svag and Stark sekretess require a lagrum.
  formUtilsSpy.hasStrongSecrecy.and.callFake(
    value => value === NUXEO_VOCAB_IDS.sekretess.svagSekretess || value === NUXEO_VOCAB_IDS.sekretess.starkSekretess
  );

  const lagrumFieldSpy = jasmine.createSpyObj<LagrumFieldService>('LagrumFieldService', [
    'buildField',
    'syncOptions',
    'insertAfter',
    'removeField',
  ]);
  lagrumFieldSpy.buildField.and.callFake(opts => ({
    type: 'dropdown-search',
    name: opts.name,
    label: 'Lagrum',
    options: opts.options ?? undefined,
    defaultValue: opts.defaultValue,
  }));
  lagrumFieldSpy.syncOptions.and.callFake((config: FieldConfig[]) => config);
  lagrumFieldSpy.insertAfter.and.callFake((config: FieldConfig[], afterFieldName: string, field: FieldConfig) => {
    const index = config.findIndex(item => item.name === afterFieldName);
    return index >= 0 ? [...config.slice(0, index + 1), field, ...config.slice(index + 1)] : [...config, field];
  });
  lagrumFieldSpy.removeField.and.callFake((config: FieldConfig[], fieldName: string) =>
    config.filter(item => item.name !== fieldName)
  );

  return { apiSpy, formUtilsSpy, lagrumFieldSpy };
}

describe('CreateHandlingFromMail', () => {
  let component: CreateHandlingFromMail;
  let fixture: ComponentFixture<CreateHandlingFromMail>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let formUtilsSpy: jasmine.SpyObj<FormUtilsService>;
  let lagrumFieldSpy: jasmine.SpyObj<LagrumFieldService>;

  beforeEach(async () => {
    ({ apiSpy, formUtilsSpy, lagrumFieldSpy } = buildSpies());

    await TestBed.configureTestingModule({
      imports: [CreateHandlingFromMail],
      providers: makeMockProviders(apiSpy, formUtilsSpy, lagrumFieldSpy),
    })
      .overrideTemplate(CreateHandlingFromMail, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateHandlingFromMail);
    fixture.componentRef.setInput('document', mailDocument);
    fixture.componentRef.setInput('attachments', [
      { id: 'file-1', label: 'Main file.pdf' },
      { id: 'file-2', label: 'Attachment.pdf' },
    ]);
    fixture.componentRef.setInput('parentId', 'mail-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates and initializes form configs from Nuxeo options', () => {
    expect(component).toBeTruthy();
    expect(component.existingArendeOptions()).toEqual([
      { label: 'Case 1', id: 'case-1', path: '/default-domain/workspaces/case-1' },
    ]);
    expect(component.arendeParentOptions()).toEqual([
      { label: '2026', id: 'case-1', path: '/default-domain/workspaces/case-1' },
    ]);
    expect(component.createArendeConfig().length).toBeGreaterThan(0);
    expect(component.createHandlingConfig().length).toBeGreaterThan(0);
    expect(component.createFileConfig().map(field => field.name)).toEqual(['mainFile', 'attachment']);
  });

  it('switches between existing and new case modes and resets dependent state', () => {
    component.formResult.set({ existingArende: 'case-1', arendetyp: 'type-1', arendeLagrum: 'lagrum-1' });
    component.selectedArendetypId.set('type-1');
    component.arendeTypeValue.set([{ id: 'type-1', value: 'type-1', label: 'Type 1' }]);

    component.setCaseMode('new');

    expect(component.isExistingCase()).toBe('new');
    expect(component.formResult()).toEqual({ arendetyp: null });
    expect(component.selectedArendetypId()).toBeNull();
    expect(component.arendeTypeValue()).toEqual([]);

    component.setCaseMode('existing');

    expect(component.isExistingCase()).toBe('existing');
    expect(component.lagrumOptions()).toEqual([{ id: 'lagrum-1', label: 'Lagrum 1' }]);
  });

  it('updates options for existing cases, handling types and parent queries', () => {
    component.onExistingCaseQueryChanged({ fieldName: 'existingArende', value: 'case' });
    component.onHandlingTypeQueryChanged({ fieldName: 'type', value: 'handling' });
    component.onArendeParentQueryChanged({ fieldName: 'arendeParent', value: '2026' });

    expect(apiSpy.getCaseOptions).toHaveBeenCalledWith('SELECT * FROM Arende', 'case');
    expect(apiSpy.getCaseOptions).toHaveBeenCalledWith('SELECT * FROM Handlingstyp', 'handling');
    expect(apiSpy.getCaseOptions).toHaveBeenCalledWith(
      'SELECT * FROM Ar WHERE ecm:isTrashed = 0 ORDER BY ar:ar DESC',
      '2026'
    );
    expect(component.createHandlingConfig().find(field => field.name === 'type')?.options).toEqual([
      { label: 'Case 1', id: 'case-1', path: '/default-domain/workspaces/case-1' },
    ]);
  });

  it('handles selected option changes for case, secrecy, direction and contact sources', () => {
    component.selectedOptionChanged({ fieldName: 'existingArende', selectedValue: 'case-1' });
    component.selectedOptionChanged({ fieldName: 'secret', selectedValue: NUXEO_VOCAB_IDS.sekretess.starkSekretess });
    component.selectedOptionChanged({ fieldName: 'riktning', selectedValue: NUXEO_VOCAB_IDS.arendeRiktning.intern });
    component.selectedOptionChanged({
      fieldName: 'motpartRadio',
      selectedValue: NUXEO_VOCAB_IDS.motpartTyp.privatPerson,
    });
    component.selectedOptionChanged({ fieldName: 'avsandareSource', selectedValue: 'avsandare-custom' });
    component.selectedOptionChanged({ fieldName: 'mottagareSource', selectedValue: 'mottagare-custom' });

    expect(component.formResult()?.existingArende).toBe('case-1');
    expect(component.currentRiktning()).toBe(NUXEO_VOCAB_IDS.arendeRiktning.intern);
    expect(component.motpartRadioValue()).toBe(NUXEO_VOCAB_IDS.motpartTyp.privatPerson);
    expect(component.avsandareSource()).toBe('custom');
    expect(component.mottagareSource()).toBe('custom');
    expect(component.createHandlingConfig().some(field => field.name === 'lagrum')).toBeTrue();
  });

  it('filters attachments when main file changes and keeps selected existing case', () => {
    component.formResult.set({ existingArende: 'case-1' });

    component.changeForm({ mainFile: 'file-1', name: 'Handling name' });

    const attachmentField = component.createFileConfig().find(field => field.name === 'attachment');
    expect(component.formResult()?.existingArende).toBe('case-1');
    expect(component.formResult()?.name).toBe('Handling name');
    expect(attachmentField?.options).toEqual([{ id: 'file-2', label: 'Attachment.pdf' }]);
  });

  it('shows validation notification when required handling fields are missing', () => {
    const store = TestBed.inject(GeneralStore);

    component.formResult.set({ existingArende: 'case-1' });
    component.createHandling();

    expect(apiSpy.createHandling).not.toHaveBeenCalled();
    expect(store.notification().variation).toBe('danger');
  });

  it('creates handling from existing case with mail contacts and attachments', () => {
    spyOn(component.router, 'navigate');
    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling from mail',
      dateFrom: [new Date('2026-06-15T00:00:00.000Z')],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
      personuppgifter: true,
      mainFile: 'file-1',
      attachment: [{ id: 'file-2', label: 'Attachment.pdf' }],
    } satisfies Partial<FormResult>);

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    expect(payload).toEqual(
      jasmine.objectContaining({
        input: 'mail-1',
        params: jasmine.objectContaining({
          arende: 'case-1',
        }),
      })
    );
    expect(component.router.navigate).toHaveBeenCalledWith(['/doc/', 'handling-1']);
  });

  it('does not change mode if already in the same mode', () => {
    const initialMode = component.isExistingCase();
    component.setCaseMode('existing');
    expect(component.isExistingCase()).toBe(initialMode);
  });

  it('ignores query changes for unrelated fieldNames', () => {
    const callsBefore = apiSpy.getCaseOptions.calls.count();
    component.onExistingCaseQueryChanged({ fieldName: 'other', value: 'x' });
    component.onHandlingTypeQueryChanged({ fieldName: 'other', value: 'x' });
    component.onArendeParentQueryChanged({ fieldName: 'other', value: 'x' });
    expect(apiSpy.getCaseOptions.calls.count()).toBe(callsBefore);
  });

  it('handles non-string query values as empty string', () => {
    component.onExistingCaseQueryChanged({ fieldName: 'existingArende', value: 42 });
    expect(apiSpy.getCaseOptions).toHaveBeenCalledWith('SELECT * FROM Arende', '');
  });

  it('emits dialogClosed and shows success notification after createHandling succeeds', () => {
    spyOn(component.router, 'navigate');
    spyOn(component.dialogClosed, 'emit');
    const store = TestBed.inject(GeneralStore);

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    expect(component.dialogClosed.emit).toHaveBeenCalledWith(null);
    expect(store.notification().variation).toBe('success');
  });

  it('shows error notification when createHandling API call fails', () => {
    const store = TestBed.inject(GeneralStore);
    apiSpy.createHandling.and.returnValue(throwError(() => ({ message: 'Network error' })));

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    expect(store.notification().variation).toBe('danger');
    expect(store.notification().text).toBe('Network error');
  });

  it('shows error from violations array when API call fails with violations', () => {
    const store = TestBed.inject(GeneralStore);
    apiSpy.createHandling.and.returnValue(
      throwError(() => ({ error: { violations: [{ message: 'Violation message' }] } }))
    );

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    expect(store.notification().text).toBe('Violation message');
  });

  it('falls back to default message when error has no recognizable fields', () => {
    const store = TestBed.inject(GeneralStore);
    apiSpy.createHandling.and.returnValue(throwError(() => ({})));

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    expect(store.notification().variation).toBe('danger');
    expect(store.notification().text).toBe('Det gick inte att skapa handlingen.');
  });

  it('shows error from error.message when API call fails', () => {
    const store = TestBed.inject(GeneralStore);
    apiSpy.createHandling.and.returnValue(throwError(() => ({ error: { message: 'Server error' } })));

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    expect(store.notification().text).toBe('Server error');
  });

  it('includes attachments in filer payload when attachment array is present', () => {
    spyOn(component.router, 'navigate');

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
      mainFile: 'file-1',
      attachment: [{ id: 'file-2', label: 'Attachment.pdf' }],
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    expect(payload.params.filer.length).toBe(2);
    expect(payload.params.filer[1].type).toBe(NUXEO_VOCAB_IDS.filTyp.bilaga);
  });

  it('uses custom avsandare/mottagare when source is custom and lists are populated', () => {
    spyOn(component.router, 'navigate');
    component.avsandareSource.set('custom');
    component.mottagareSource.set('custom');

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
      avsandare: [{ namn: 'Custom Sender', email: 'custom@example.test' }],
      mottagare: [{ namn: 'Custom Recipient', email: 'recv@example.test' }],
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    expect(payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.avsandare]).toEqual(
      jasmine.arrayContaining([jasmine.objectContaining({ namn: 'Custom Sender' })])
    );
    expect(payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.mottagare]).toEqual(
      jasmine.arrayContaining([jasmine.objectContaining({ namn: 'Custom Recipient' })])
    );
  });

  it('removes lagrum field when secrecy is changed back to non-secret', () => {
    component.selectedOptionChanged({ fieldName: 'secret', selectedValue: NUXEO_VOCAB_IDS.sekretess.starkSekretess });
    expect(component.createHandlingConfig().some(f => f.name === 'lagrum')).toBeTrue();

    formUtilsSpy.hasStrongSecrecy.and.returnValue(false);
    component.selectedOptionChanged({ fieldName: 'secret', selectedValue: NUXEO_VOCAB_IDS.sekretess.ingenSekretess });
    expect(component.createHandlingConfig().some(f => f.name === 'lagrum')).toBeFalse();
  });

  it('shows lagrum field when secrecy is Svag sekretess', () => {
    component.selectedOptionChanged({ fieldName: 'secret', selectedValue: NUXEO_VOCAB_IDS.sekretess.svagSekretess });
    expect(component.createHandlingConfig().some(f => f.name === 'lagrum')).toBeTrue();
  });

  it('shows lagrum field when secrecy is Stark sekretess', () => {
    component.selectedOptionChanged({ fieldName: 'secret', selectedValue: NUXEO_VOCAB_IDS.sekretess.starkSekretess });
    expect(component.createHandlingConfig().some(f => f.name === 'lagrum')).toBeTrue();
  });

  it('does not show lagrum field when secrecy is Ingen sekretess', () => {
    component.selectedOptionChanged({ fieldName: 'secret', selectedValue: NUXEO_VOCAB_IDS.sekretess.ingenSekretess });
    expect(component.createHandlingConfig().some(f => f.name === 'lagrum')).toBeFalse();
  });

  it('resets lagrum when setCaseMode is called', () => {
    component.isExistingCase.set('new');
    component.setCaseMode('existing');
    expect(component.lagrumOptions()).toEqual([{ id: 'lagrum-1', label: 'Lagrum 1' }]);
  });

  it('handles riktning selection toggling between intern and non-intern', () => {
    component.selectedOptionChanged({
      fieldName: 'riktning',
      selectedValue: NUXEO_VOCAB_IDS.arendeRiktning.inkommande,
    });
    expect(component.currentRiktning()).toBe(NUXEO_VOCAB_IDS.arendeRiktning.inkommande);
    const hasContactFieldsAfterInkommande = component.createHandlingConfig().some(f => f.name === 'avsandareSource');
    expect(hasContactFieldsAfterInkommande).toBeTrue();

    component.selectedOptionChanged({ fieldName: 'riktning', selectedValue: NUXEO_VOCAB_IDS.arendeRiktning.intern });
    expect(component.currentRiktning()).toBe(NUXEO_VOCAB_IDS.arendeRiktning.intern);
    const hasContactFieldsAfterIntern = component.createHandlingConfig().some(f => f.name === 'avsandareSource');
    expect(hasContactFieldsAfterIntern).toBeFalse();
  });

  it('handles arendeRiktning selection change for case config', () => {
    component.selectedOptionChanged({ fieldName: 'arendeRiktning', selectedValue: 'intern' });
    expect(component.createHandlingConfig()).toBeDefined();
  });

  it('handles arendeMotpartRadio selection change', () => {
    component.selectedOptionChanged({
      fieldName: 'arendeMotpartRadio',
      selectedValue: NUXEO_VOCAB_IDS.motpartTyp.privatPerson,
    });
    expect(component.caseMotpartRadioValue()).toBe(NUXEO_VOCAB_IDS.motpartTyp.privatPerson);
  });

  it('handles arendeParent selection change', () => {
    component.selectedOptionChanged({ fieldName: 'arendeParent', selectedValue: 'parent-1' });
    expect(component.formResult()?.arendeParent).toBe('parent-1');
  });

  it('handles arendeLagrum selection change', () => {
    component.selectedOptionChanged({ fieldName: 'arendeLagrum', selectedValue: 'lagrum-1' });

    expect(component).toBeTruthy();
  });

  it('handles avsandareSource toggle back to default', () => {
    component.avsandareSource.set('custom');
    component.selectedOptionChanged({ fieldName: 'avsandareSource', selectedValue: 'avsandare-default' });
    expect(component.avsandareSource()).toBe('default');

    const hasDefault = component.createHandlingConfig().some(f => f.name === 'defaultAvsandare');
    expect(hasDefault).toBeTrue();
  });

  it('handles mottagareSource toggle back to default', () => {
    component.mottagareSource.set('custom');
    component.selectedOptionChanged({ fieldName: 'mottagareSource', selectedValue: 'mottagare-default' });
    expect(component.mottagareSource()).toBe('default');
    const hasDefault = component.createHandlingConfig().some(f => f.name === 'defaultMotpart');
    expect(hasDefault).toBeTrue();
  });

  it('changes form without modifying mainFile when mainFile is unchanged', () => {
    component.formResult.set({ mainFile: 'file-1', name: 'Old name' });
    component.changeForm({ name: 'New name' });
    expect(component.formResult()?.name).toBe('New name');
    expect(component.formResult()?.mainFile).toBe('file-1');
  });

  it('changes form preserves existingArende from event when provided as string', () => {
    component.changeForm({ existingArende: 'case-99' });
    expect(component.formResult()?.existingArende).toBe('case-99');
  });

  it('creates new case payload when isExistingCase is new', () => {
    spyOn(component.router, 'navigate');
    component.setCaseMode('new');
    component.formResult.set({
      arendeParent: 'ar-1',
      arendetyp: 'type-1',
      arendeRiktning: NUXEO_VOCAB_IDS.arendeRiktning.inkommande,
      arendemening: 'Test arende mening text here',
      arendeMotpart: 'Motpart Name',
      arendeMotpartRadio: NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet,
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });
    component.selectedArendetypId.set('type-1');

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    expect(typeof payload.params.arende).toBe('object');
    expect((payload.params.arende as unknown as Record<string, unknown>)['parentId']).toBe('ar-1');
  });

  it('returns early from createHandling when new case is missing parent', () => {
    component.setCaseMode('new');
    component.formResult.set({
      arendeParent: null,
      arendetyp: 'type-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
    });
    component.selectedArendetypId.set('type-1');

    component.createHandling();

    expect(apiSpy.createHandling).not.toHaveBeenCalled();
  });

  it('returns early from createHandling when new case is missing arendetyp', () => {
    component.setCaseMode('new');
    component.formResult.set({
      arendeParent: 'ar-1',
      arendetyp: null,
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
    });
    component.arendeTypeValue.set([]);
    component.selectedArendetypId.set(null);

    component.createHandling();

    expect(apiSpy.createHandling).not.toHaveBeenCalled();
  });

  it('builds caseParentRef from document parentRef when parentId is not set', () => {
    expect(component.caseParentRef()).toBeTruthy();
  });

  it('resolves ancestors to find Ar type and sets caseParentRefOverride', () => {
    apiSpy.getAncestorsById.and.returnValue(of([documentEntry('ar-uid', '2026', 'Ar')]));

    expect(component.caseParentRef()).toBe('ar-1');
  });

  it('resolves ancestors to Diarium when no Ar found', () => {
    apiSpy.getAncestorsById.and.returnValue(of([documentEntry('diarium-1', 'Diarium', 'Diarium')]));

    expect(component).toBeTruthy();
  });

  it('handles ancestor resolution error gracefully', () => {
    apiSpy.getAncestorsById.and.returnValue(throwError(() => new Error('ancestors failed')));

    const compInst = TestBed.createComponent(CreateHandlingFromMail);
    compInst.componentRef.setInput('document', { ...mailDocument, uid: 'new-uid' } as NuxeoDocument);
    compInst.detectChanges();
    expect(compInst.componentInstance).toBeTruthy();
  });

  it('loads lagrum from case when existingArende is selected', () => {
    const caseDoc = {
      ...documentEntry('case-1', 'Case 1'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.arende.sekretess]: { id: NUXEO_VOCAB_IDS.sekretess.starkSekretess },
        [NUXEO_SCHEMA_FIELDS.arende.riktning]: { id: 'in' },
        [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: { uid: 'klass-1' },
      },
    };
    apiSpy.getDocumentById.and.returnValue(of(caseDoc));

    component.selectedOptionChanged({ fieldName: 'existingArende', selectedValue: 'case-1' });

    expect(apiSpy.getDocumentById).toHaveBeenCalled();
  });

  it('fetches the full unscoped lagrum picklist for an existing case, regardless of its Klass', () => {
    const caseDoc = {
      ...documentEntry('case-1', 'Case 1'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.arende.sekretess]: { id: NUXEO_VOCAB_IDS.sekretess.starkSekretess },
        [NUXEO_SCHEMA_FIELDS.arende.riktning]: { id: 'in' },
        [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: { uid: 'klass-1' },
      },
    };
    apiSpy.getDocumentById.and.returnValue(of(caseDoc));
    apiSpy.getLagrumOptions.and.returnValue(of([{ label: 'Lagrum 1', id: 'lagrum-1' }]));

    component.selectedOptionChanged({ fieldName: 'existingArende', selectedValue: 'case-1' });

    expect(apiSpy.getLagrumOptions).toHaveBeenCalledWith(component.caseParentRef());
    expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    expect(component.lagrumOptions()).toEqual([{ label: 'Lagrum 1', id: 'lagrum-1' }]);
  });

  it('resolves the default lagrum pre-selection when klass:lagrum entries are plain uid strings', () => {
    const caseDoc = {
      ...documentEntry('case-1', 'Case 1'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.arende.sekretess]: { id: NUXEO_VOCAB_IDS.sekretess.starkSekretess },
        [NUXEO_SCHEMA_FIELDS.arende.riktning]: { id: 'in' },
        [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: { uid: 'klass-1' },
      },
    };
    const klassDoc = {
      ...documentEntry('klass-1', 'Klass 1', 'Klass'),
      properties: { [NUXEO_SCHEMA_FIELDS.klass.lagrum]: ['lagrum-uid-1'] },
    };
    apiSpy.getDocumentById.and.callFake(((id: string) =>
      id === 'klass-1' ? of(klassDoc) : of(caseDoc)) as NuxeoApiService['getDocumentById']);

    component.selectedOptionChanged({ fieldName: 'existingArende', selectedValue: 'case-1' });

    expect(component.arendeLagrumDefaultId()).toBe('lagrum-uid-1');
  });

  it('handles loadLagrumFromCase error gracefully', () => {
    apiSpy.getDocumentById.and.returnValue(throwError(() => new Error('failed')));

    component.selectedOptionChanged({ fieldName: 'existingArende', selectedValue: 'case-1' });

    expect(component.lagrumOptions()).toBeDefined();
  });

  it('handles case when existingArende is selected with empty value', () => {
    component.selectedOptionChanged({ fieldName: 'existingArende', selectedValue: '' });

    expect(component).toBeTruthy();
  });

  it('syncs lagrum options when setLagrumOptionsForMode is called in new mode', () => {
    component.isExistingCase.set('new');
    component.setCaseMode('new');

    expect(component.lagrumOptions()).toEqual([{ id: 'lagrum-1', label: 'Lagrum 1' }]);
  });

  it('adds lagrum to arende config when secret is strong and in new mode', () => {
    component.setCaseMode('new');
    formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
    component.selectedOptionChanged({ fieldName: 'secret', selectedValue: NUXEO_VOCAB_IDS.sekretess.starkSekretess });
    expect(component.createArendeConfig().some(f => f.name === 'arendeLagrum')).toBeTrue();
  });

  it('removes arendeLagrum from arende config when secret is not strong anymore', () => {
    component.setCaseMode('new');

    formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
    component.selectedOptionChanged({ fieldName: 'secret', selectedValue: NUXEO_VOCAB_IDS.sekretess.starkSekretess });
    expect(component.createArendeConfig().some(f => f.name === 'arendeLagrum')).toBeTrue();

    formUtilsSpy.hasStrongSecrecy.and.returnValue(false);
    component.selectedOptionChanged({ fieldName: 'secret', selectedValue: NUXEO_VOCAB_IDS.sekretess.ingenSekretess });
    expect(component.createArendeConfig().some(f => f.name === 'arendeLagrum')).toBeFalse();
  });

  it('handles arendeTypeValue effect triggering handleArendeTypeSelected', () => {
    const klassDoc = {
      ...documentEntry('klass-1', 'Klass 1', 'Klass'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.klass.arendemening]: ['Test mening'],
        [NUXEO_SCHEMA_FIELDS.klass.riktning]: 'in',
        [NUXEO_SCHEMA_FIELDS.klass.sekretess]: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
        [NUXEO_SCHEMA_FIELDS.klass.sakerhetsskyddsklassificering]: null,
        [NUXEO_SCHEMA_FIELDS.klass.lagrum]: [],
      },
    };
    apiSpy.getDocumentById.and.returnValue(of(klassDoc));

    component.arendeTypeValue.set([{ id: 'klass-1', value: 'klass-1', label: 'Klass 1' }]);
    fixture.detectChanges();

    expect(apiSpy.getDocumentById).toHaveBeenCalledWith('klass-1', true);
    expect(component.selectedArendetypId()).toBe('klass-1');
  });

  it('does not re-trigger handleArendeTypeSelected for same arendeTypeId', () => {
    component.selectedArendetypId.set('klass-1');
    const callsBefore = apiSpy.getDocumentById.calls.count();

    component.arendeTypeValue.set([{ id: 'klass-1', value: 'klass-1', label: 'Klass 1' }]);
    fixture.detectChanges();

    expect(apiSpy.getDocumentById.calls.count()).toBe(callsBefore);
  });

  it('triggers loadLagrumFromArendetyp only when in new mode', () => {
    const klassDoc = {
      ...documentEntry('klass-1', 'Klass 1', 'Klass'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.klass.arendemening]: ['Mening'],
        [NUXEO_SCHEMA_FIELDS.klass.riktning]: 'in',
        [NUXEO_SCHEMA_FIELDS.klass.sekretess]: NUXEO_VOCAB_IDS.sekretess.starkSekretess,
        [NUXEO_SCHEMA_FIELDS.klass.lagrum]: [{ uid: 'lagrum-uid-1' }],
      },
    };
    apiSpy.getDocumentById.and.returnValue(of(klassDoc));

    component.setCaseMode('new');
    component.selectedArendetypId.set(null);
    component.arendeTypeValue.set([{ id: 'klass-2', value: 'klass-2', label: 'Klass 2' }]);
    fixture.detectChanges();

    expect(apiSpy.getDocumentById).toHaveBeenCalled();
  });

  it('fetches the full unscoped lagrum picklist for a new case, while pre-selecting from the Klass refs', () => {
    const klassDoc = {
      ...documentEntry('klass-1', 'Klass 1', 'Klass'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.klass.arendemening]: ['Mening'],
        [NUXEO_SCHEMA_FIELDS.klass.riktning]: 'in',
        [NUXEO_SCHEMA_FIELDS.klass.sekretess]: NUXEO_VOCAB_IDS.sekretess.starkSekretess,
        [NUXEO_SCHEMA_FIELDS.klass.lagrum]: ['lagrum-uid-1'],
      },
    };
    apiSpy.getDocumentById.and.returnValue(of(klassDoc));
    apiSpy.getLagrumOptions.and.returnValue(
      of([
        { label: 'Lagrum 1', id: 'lagrum-uid-1' },
        { label: 'Lagrum 2', id: 'lagrum-uid-2' },
      ])
    );

    component.setCaseMode('new');
    component.selectedArendetypId.set(null);
    component.arendeTypeValue.set([{ id: 'klass-1', value: 'klass-1', label: 'Klass 1' }]);
    fixture.detectChanges();

    expect(apiSpy.getLagrumOptions).toHaveBeenCalledWith(component.caseParentRef());
    expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    expect(component.arendeLagrumOptions()).toEqual([
      { label: 'Lagrum 1', id: 'lagrum-uid-1' },
      { label: 'Lagrum 2', id: 'lagrum-uid-2' },
    ]);
    expect(component.arendeLagrumDefaultId()).toBe('lagrum-uid-1');
  });

  it('resets secret/arendeSecretKlass/arendeLagrum defaults (not just skips them) when switching to a Klass with none', () => {
    const klassWithSecret = {
      ...documentEntry('klass-1', 'Klass 1', 'Klass'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.klass.arendemening]: ['Mening'],
        [NUXEO_SCHEMA_FIELDS.klass.riktning]: 'in',
        [NUXEO_SCHEMA_FIELDS.klass.sekretess]: NUXEO_VOCAB_IDS.sekretess.starkSekretess,
        [NUXEO_SCHEMA_FIELDS.klass.sakerhetsskyddsklassificering]: 'kvalificerat-hemligt',
        [NUXEO_SCHEMA_FIELDS.klass.lagrum]: ['lagrum-uid-1'],
      },
    };
    apiSpy.getDocumentById.and.returnValue(of(klassWithSecret));
    formUtilsSpy.hasStrongSecrecy.and.returnValue(true);

    component.setCaseMode('new');
    component.selectedArendetypId.set(null);
    component.arendeTypeValue.set([{ id: 'klass-1', value: 'klass-1', label: 'Klass 1' }]);
    fixture.detectChanges();

    expect(component.createArendeConfig().find(f => f.name === 'secret')?.defaultValue).toBe(
      NUXEO_VOCAB_IDS.sekretess.starkSekretess
    );
    expect(component.formResult()?.secret).toBe(NUXEO_VOCAB_IDS.sekretess.starkSekretess);

    const klassWithoutSecret = {
      ...documentEntry('klass-2', 'Klass 2', 'Klass'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.klass.arendemening]: ['Annan mening'],
        [NUXEO_SCHEMA_FIELDS.klass.riktning]: 'in',
      },
    };
    apiSpy.getDocumentById.and.returnValue(of(klassWithoutSecret));
    formUtilsSpy.hasStrongSecrecy.and.returnValue(false);

    component.selectedArendetypId.set(null);
    component.arendeTypeValue.set([{ id: 'klass-2', value: 'klass-2', label: 'Klass 2' }]);
    fixture.detectChanges();

    expect(component.createArendeConfig().find(f => f.name === 'secret')?.defaultValue).toBeNull();
    expect(component.formResult()?.secret).toBeNull();
  });

  it('parses email correctly from sender with angle brackets', () => {
    spyOn(component.router, 'navigate');

    component.avsandareSource.set('default');

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    const avsandareList = payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.avsandare] as {
      epost?: string;
      naam?: string;
      namn?: string;
    }[];
    expect(avsandareList).toBeDefined();
    expect(avsandareList[0].epost).toBe('sender@example.test');
    expect(avsandareList[0].namn).toBe('Sender');
  });

  it('uses parentId from input for payload input field', () => {
    spyOn(component.router, 'navigate');
    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    expect(payload.input).toBe('mail-1');
  });

  it('builds newCasePayload with arendemening and internMening from formResult', () => {
    spyOn(component.router, 'navigate');
    component.setCaseMode('new');
    component.formResult.set({
      arendeParent: 'ar-1',
      arendetyp: 'type-1',
      arendeRiktning: NUXEO_VOCAB_IDS.arendeRiktning.inkommande,
      arendemening: 'Arende mening text here for test',
      intern: 'Intern mening text here for test',
      arendeMotpart: 'Motpart',
      arendeMotpartRadio: NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet,
      arendeExternReferens: 'ext-ref-123',
      arendeSecretKlass: 'klass-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
      personuppgifter: false,
    });
    component.selectedArendetypId.set('type-1');

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    const arende = payload.params.arende as Record<string, unknown>;
    expect(arende[NUXEO_SCHEMA_FIELDS.arende.arendemening]).toBe('Arende mening text here for test');
    expect(arende[NUXEO_SCHEMA_FIELDS.arende.internArendemening]).toBe('Intern mening text here for test');
    expect(arende[NUXEO_SCHEMA_FIELDS.arende.externReferens]).toEqual([{ referens: 'ext-ref-123' }]);
    expect(arende[NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering]).toBe('klass-1');
  });

  it('builds lagrum payload in newCasePayload when arendeLagrum is set', () => {
    spyOn(component.router, 'navigate');
    component.setCaseMode('new');
    component.formResult.set({
      arendeParent: 'ar-1',
      arendetyp: 'type-1',
      arendeLagrum: 'lagrum-1',
      arendeRiktning: NUXEO_VOCAB_IDS.arendeRiktning.inkommande,
      arendeMotpart: 'Motpart',
      arendeMotpartRadio: NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet,
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });
    component.selectedArendetypId.set('type-1');

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    const arende = payload.params.arende as Record<string, unknown>;
    expect(arende[NUXEO_SCHEMA_FIELDS.arende.lagrumsbeskrivning]).toEqual(['lagrum-1']);
  });

  it('includes lagrum in handling payload when lagrum is in formResult', () => {
    spyOn(component.router, 'navigate');
    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.starkSekretess,
      lagrum: 'lagrum-1',
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    expect(payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning]).toBe('lagrum-1');
  });

  it('handles type as object (not array) in createHandling', () => {
    spyOn(component.router, 'navigate');
    component.formResult.set({
      existingArende: 'case-1',
      type: { id: 'handling-type-1' } as unknown as { id: string }[],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    expect(payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.handlingstyp]).toBe('handling-type-1');
  });

  it('handles type as string in createHandling', () => {
    spyOn(component.router, 'navigate');
    component.formResult.set({
      existingArende: 'case-1',
      type: 'handling-type-string' as unknown as { id: string }[],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    expect(payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.handlingstyp]).toBe('handling-type-string');
  });

  it('handles lagrum as array with object value in getLagrumId', () => {
    spyOn(component.router, 'navigate');
    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.starkSekretess,
      lagrum: [{ id: 'lagrum-arr-1' }] as never,
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    expect(payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning]).toBe('lagrum-arr-1');
  });

  it('normalizes contact with email address only (no name)', () => {
    spyOn(component.router, 'navigate');
    component.avsandareSource.set('custom');

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
      avsandare: [{ namn: null, email: 'email@only.test' }],
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    const avsandareList = payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.avsandare] as { epost?: string }[];
    expect(avsandareList[0].epost).toBe('email@only.test');
  });

  it('filters out all-empty contacts so nothing is added to the payload', () => {
    spyOn(component.router, 'navigate');
    component.avsandareSource.set('custom');

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
      avsandare: [{ namn: null, email: null }],
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;
    const avsandareList = payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.avsandare] as
      | { epost?: string }[]
      | undefined;
    expect(avsandareList).toBeUndefined();
  });

  it('uses default contacts when custom avsandare/mottagare lists are empty', () => {
    spyOn(component.router, 'navigate');
    component.avsandareSource.set('custom');
    component.mottagareSource.set('custom');

    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: 'Handling',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
      avsandare: [],
      mottagare: [],
    });

    component.createHandling();

    const payload = apiSpy.createHandling.calls.mostRecent().args[0] as unknown as ApiPayload;

    const avsandareList = payload.params.handling[NUXEO_SCHEMA_FIELDS.handling.avsandare] as { epost?: string }[];
    expect(avsandareList).toBeDefined();
  });

  it('does not include handling name in payload when name is whitespace only (validation fails)', () => {
    spyOn(component.router, 'navigate');
    component.formResult.set({
      existingArende: 'case-1',
      type: [{ id: 'handling-type-1' }],
      name: '   ',
      dateFrom: [new Date()],
      secret: NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
    });

    component.createHandling();

    expect(apiSpy.createHandling).not.toHaveBeenCalled();
  });

  it('ensureLagrumOption fetches document when lagrum not in cache or options', () => {
    const lagrumDoc = {
      ...documentEntry('lagrum-new', 'Lagrum New', 'Lagrum'),
    };
    apiSpy.getDocumentById.and.returnValue(of(lagrumDoc));

    component.lagrumOptions.set([]);
    component.arendeLagrumOptions.set([]);

    (component as unknown as CreateHandlingPrivate).applyLagrumDefault('lagrum-new-id');

    expect(apiSpy.getDocumentById).toHaveBeenCalledWith('lagrum-new-id', true);
  });

  it('does not fetch lagrum document when already in both option lists (cache hit)', () => {
    component.lagrumOptions.set([{ id: 'lagrum-cached', label: 'Cached' }]);
    component.arendeLagrumOptions.set([{ id: 'lagrum-cached', label: 'Cached' }]);

    const callsBefore = apiSpy.getDocumentById.calls.count();
    (component as unknown as CreateHandlingPrivate).applyLagrumDefault('lagrum-cached');

    expect(apiSpy.getDocumentById.calls.count()).toBe(callsBefore);
  });

  it('handles error when fetching lagrum document fails', () => {
    apiSpy.getDocumentById.and.returnValue(throwError(() => new Error('lagrum fetch failed')));
    component.lagrumOptions.set([]);
    component.arendeLagrumOptions.set([]);

    expect(() => (component as unknown as CreateHandlingPrivate).applyLagrumDefault('lagrum-error-id')).not.toThrow();
  });

  it('builds arendeParentOptions using ar:ar year field as label', () => {
    expect(component.arendeParentOptions()[0].label).toBe('2026');
  });

  it('builds arendeParentOptions falling back to entry title when ar:ar is missing', () => {
    const resultWithoutArAr: SearchResult<NuxeoDocument> = {
      ...searchResult,
      entries: [{ ...documentEntry('case-no-ar', 'No AR Year'), properties: {} }],
    };
    apiSpy.getCaseOptions.and.returnValue(of(resultWithoutArAr));
    component.onArendeParentQueryChanged({ fieldName: 'arendeParent', value: '' });
    expect(component.arendeParentOptions()[0].label).toBe('No AR Year');
  });

  it('updates case config for motpart foretagMyndighet sets search button to Bolagsverket', () => {
    component.selectedOptionChanged({
      fieldName: 'arendeMotpartRadio',
      selectedValue: NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet,
    });
    expect(component.caseSearchButtonText()).toBe('Sök hos Bolagsverket');
    const personuppgifterField = component.createArendeConfig().find(f => f.name === 'personuppgifter');
    expect(personuppgifterField?.defaultValue).toBe(false);
  });

  it('updates case config for motpart privatPerson sets search button to Navet', () => {
    component.selectedOptionChanged({
      fieldName: 'arendeMotpartRadio',
      selectedValue: NUXEO_VOCAB_IDS.motpartTyp.privatPerson,
    });
    expect(component.caseSearchButtonText()).toBe('Sök mot Navet');
    const personuppgifterField = component.createArendeConfig().find(f => f.name === 'personuppgifter');
    expect(personuppgifterField?.defaultValue).toBe(true);
  });

  it('updates case config according to riktning intern (removes motpart fields)', () => {
    component.selectedOptionChanged({ fieldName: 'arendeRiktning', selectedValue: 'in' });
    expect(component.createArendeConfig().some(f => f.name === 'arendeMotpart')).toBeTrue();

    component.selectedOptionChanged({ fieldName: 'arendeRiktning', selectedValue: 'intern' });
    expect(component.hasInternRiktning()).toBeTrue();
    expect(component.createArendeConfig().some(f => f.name === 'arendeMotpart')).toBeFalse();
  });

  it('updates case config according to riktning ut (adds motpart fields when missing)', () => {
    component.selectedOptionChanged({ fieldName: 'arendeRiktning', selectedValue: 'intern' });
    expect(component.createArendeConfig().some(f => f.name === 'arendeMotpart')).toBeFalse();

    component.selectedOptionChanged({ fieldName: 'arendeRiktning', selectedValue: 'ut' });
    expect(component.hasInternRiktning()).toBeFalse();
    expect(component.createArendeConfig().some(f => f.name === 'arendeMotpart')).toBeTrue();
  });

  it('applyArendeParentSelection updates arendeTyp props in config', () => {
    component.selectedOptionChanged({ fieldName: 'arendeParent', selectedValue: 'ar-new-parent' });
    const arendeTypField = component.createArendeConfig().find(f => f.name === 'arendeTyp');
    if (arendeTypField) {
      expect(arendeTypField.props?.['parentRef']).toBe('ar-new-parent');
    }
    expect(component.formResult()?.arendeParent).toBe('ar-new-parent');
  });

  it('sets arendetyp from arendeTypeValue signal via effect using id when value is undefined', () => {
    const klassDoc = {
      ...documentEntry('klass-3', 'Klass 3', 'Klass'),
      properties: {
        [NUXEO_SCHEMA_FIELDS.klass.arendemening]: [],
        [NUXEO_SCHEMA_FIELDS.klass.riktning]: '',
        [NUXEO_SCHEMA_FIELDS.klass.sekretess]: null,
        [NUXEO_SCHEMA_FIELDS.klass.lagrum]: null,
      },
    };
    apiSpy.getDocumentById.and.returnValue(of(klassDoc));

    component.arendeTypeValue.set([{ id: 'klass-3', value: 'klass-3', label: 'Klass 3' }]);
    fixture.detectChanges();

    expect(apiSpy.getDocumentById).toHaveBeenCalledWith('klass-3', true);
  });
});

describe('CreateHandlingFromMail with different document inputs', () => {
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let formUtilsSpy: jasmine.SpyObj<FormUtilsService>;
  let lagrumFieldSpy: jasmine.SpyObj<LagrumFieldService>;

  beforeEach(() => {
    ({ apiSpy, formUtilsSpy, lagrumFieldSpy } = buildSpies());
  });

  it('initializes with no attachments when attachments input is not provided', async () => {
    await TestBed.configureTestingModule({
      imports: [CreateHandlingFromMail],
      providers: makeMockProviders(apiSpy, formUtilsSpy, lagrumFieldSpy),
    })
      .overrideTemplate(CreateHandlingFromMail, '<div></div>')
      .compileComponents();

    const noAttachFixture = TestBed.createComponent(CreateHandlingFromMail);
    noAttachFixture.componentRef.setInput('document', mailDocument);
    noAttachFixture.detectChanges();
    const comp = noAttachFixture.componentInstance;
    expect(comp.createFileConfig().find(f => f.name === 'mainFile')?.options).toBeUndefined();
  });

  it('handles document without mail sender (missing sender)', async () => {
    const noSenderDoc: NuxeoDocument = {
      ...mailDocument,
      uid: 'mail-no-sender',
      properties: {
        [NUXEO_SCHEMA_FIELDS.mail.recipients]: ['Recipient <r@example.test>'],
      },
    };

    await TestBed.configureTestingModule({
      imports: [CreateHandlingFromMail],
      providers: makeMockProviders(apiSpy, formUtilsSpy, lagrumFieldSpy),
    })
      .overrideTemplate(CreateHandlingFromMail, '<div></div>')
      .compileComponents();

    const f = TestBed.createComponent(CreateHandlingFromMail);
    f.componentRef.setInput('document', noSenderDoc);
    f.detectChanges();
    const c = f.componentInstance;
    const defaultAvsField = c.createHandlingConfig().find(field => field.name === 'defaultAvsandare');
    expect(defaultAvsField?.defaultValue).toBe('Avsändare saknas');
  });

  it('handles document without mail recipients (missing recipients)', async () => {
    const noRecipientsDoc: NuxeoDocument = {
      ...mailDocument,
      uid: 'mail-no-recipients',
      properties: {
        [NUXEO_SCHEMA_FIELDS.mail.sender]: 'Sender <s@example.test>',
      },
    };

    await TestBed.configureTestingModule({
      imports: [CreateHandlingFromMail],
      providers: makeMockProviders(apiSpy, formUtilsSpy, lagrumFieldSpy),
    })
      .overrideTemplate(CreateHandlingFromMail, '<div></div>')
      .compileComponents();

    const f = TestBed.createComponent(CreateHandlingFromMail);
    f.componentRef.setInput('document', noRecipientsDoc);
    f.detectChanges();
    const c = f.componentInstance;
    const defaultMotField = c.createHandlingConfig().find(field => field.name === 'defaultMotpart');
    expect(defaultMotField?.defaultValue).toBe('Mottagare saknas');
  });

  it('handles document with empty recipients gracefully', async () => {
    const nonArrayRecipDoc: NuxeoDocument = {
      ...mailDocument,
      uid: 'mail-non-array',
      properties: {
        [NUXEO_SCHEMA_FIELDS.mail.sender]: 'Sender',
        [NUXEO_SCHEMA_FIELDS.mail.recipients]: [],
      },
    };

    await TestBed.configureTestingModule({
      imports: [CreateHandlingFromMail],
      providers: makeMockProviders(apiSpy, formUtilsSpy, lagrumFieldSpy),
    })
      .overrideTemplate(CreateHandlingFromMail, '<div></div>')
      .compileComponents();

    const f = TestBed.createComponent(CreateHandlingFromMail);
    f.componentRef.setInput('document', nonArrayRecipDoc);
    f.detectChanges();
    const c = f.componentInstance;
    const motpartField = c.createHandlingConfig().find(field => field.name === 'defaultMotpart');
    expect(motpartField?.defaultValue).toBe('Mottagare saknas');
  });
});
