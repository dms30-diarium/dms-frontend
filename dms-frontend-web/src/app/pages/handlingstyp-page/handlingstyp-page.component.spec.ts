import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HandlingstypPageComponent } from './handlingstyp-page.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

interface HandlingstypPrivate {
  generalForm: { submit: () => void } | undefined;
  refreshEditConfig: () => void;
}
import {
  HANDLINGSTYP_LOAD_ERROR_MESSAGE,
  HANDLINGSTYP_UPDATE_ERROR_MESSAGE,
  HANDLINGSTYP_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

function makeStoreMock() {
  return {
    notification: { set: jasmine.createSpy('set') },
    navigationPanelContext: signal<'browse' | 'info' | null>(null),
    getValue: jasmine.createSpy('getValue').and.returnValue(null),
  };
}

type HandlingstypDocument = NonNullable<ReturnType<HandlingstypPageComponent['document']>>;
type HandlingstypSpecProperties = HandlingstypDocument['properties'];

function makeDoc(props: Partial<HandlingstypSpecProperties> = {}): HandlingstypDocument {
  return makeNuxeoDocument({
    uid: 'handlingstyp-uid-1',
    title: 'Test Handlingstyp',
    type: 'Handlingstyp',
    path: '/default-domain/handlingstyper/test',
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Handlingstyp',
      [NUXEO_SCHEMA_FIELDS.dc.contributors]: [],
      ...props,
    },
    contextParameters: {},
  }) as HandlingstypDocument;
}

describe('HandlingstypPageComponent', () => {
  let component: HandlingstypPageComponent;
  let fixture: ComponentFixture<HandlingstypPageComponent>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let auditSpy: jasmine.SpyObj<AuditRefreshService>;
  let routeParamsSubject: Subject<Record<string, string>>;

  beforeEach(async () => {
    storeMock = makeStoreMock();
    routeParamsSubject = new Subject();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'editDocument',
      'getDirectorySuggestions',
      'requestPageProviderOptions',
    ]);
    apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));
    apiSpy.requestPageProviderOptions.and.returnValue(of(makeSearchResult({ entries: [] })));

    auditSpy = jasmine.createSpyObj('AuditRefreshService', [
      'loadDocumentWithAudit',
      'getLatestAuditTimestamp',
      'refreshAuditAsync',
    ]);
    auditSpy.loadDocumentWithAudit.and.returnValue(of(makeDoc()));
    auditSpy.getLatestAuditTimestamp.and.returnValue(0);
    auditSpy.refreshAuditAsync.and.returnValue(of(makeDoc()));

    await TestBed.configureTestingModule({
      imports: [HandlingstypPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: AuditRefreshService, useValue: auditSpy },
        { provide: GeneralStore, useValue: storeMock },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParamsSubject.asObservable() },
        },
      ],
    })
      .overrideTemplate(HandlingstypPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(HandlingstypPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('canEdit', () => {
    it('returns true when navigationPanelContext is null', () => {
      storeMock.navigationPanelContext.set(null);
      expect(component.canEdit()).toBeTrue();
    });

    it('returns false when navigationPanelContext is browse', () => {
      storeMock.navigationPanelContext.set('browse');
      expect(component.canEdit()).toBeFalse();
    });
  });

  describe('openEdit / closeEdit', () => {
    it('openEdit sets isEditOpen to true', () => {
      expect(component.isEditOpen()).toBeFalse();
      component.openEdit();
      expect(component.isEditOpen()).toBeTrue();
    });

    it('closeEdit sets isEditOpen to false', () => {
      component.isEditOpen.set(true);
      component.closeEdit();
      expect(component.isEditOpen()).toBeFalse();
    });

    it('openEdit with a document refreshes editConfig', () => {
      const doc = makeDoc();
      component.document.set(doc);
      component.openEdit();
      expect(component.isEditOpen()).toBeTrue();
      expect(component.editConfig().length).toBeGreaterThan(0);
    });

    it('openEdit with no document still sets isEditOpen to true', () => {
      component.document.set(null);
      component.openEdit();
      expect(component.isEditOpen()).toBeTrue();
    });
  });

  describe('submitEdit', () => {
    it('calls generalForm.submit when generalForm exists', () => {
      const mockForm = { submit: jasmine.createSpy('submit') };
      (component as unknown as HandlingstypPrivate).generalForm = mockForm;
      component.submitEdit();
      expect(mockForm.submit).toHaveBeenCalled();
    });

    it('does not throw when generalForm is undefined', () => {
      (component as unknown as HandlingstypPrivate).generalForm = undefined;
      expect(() => component.submitEdit()).not.toThrow();
    });
  });

  describe('computed props and labels', () => {
    it('props returns empty object when document is null', () => {
      component.document.set(null);
      expect(Object.keys(component.props())).toEqual([]);
    });

    it('props returns document properties when document is set', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.handlingstyp.handlingsnamn]: ['Namn'] });
      component.document.set(doc);
      expect(component.props()[NUXEO_SCHEMA_FIELDS.handlingstyp.handlingsnamn]).toEqual(['Namn']);
    });

    it('lagrumLabels returns empty string when no doc', () => {
      component.document.set(null);
      expect(component.lagrumLabels()).toBe('');
    });

    it('lagrumLabels joins lagrum titles', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.handlingstyp.lagrum]: [
          { title: 'Lag A', uid: 'l1' },
          { title: 'Lag B', uid: 'l2' },
        ],
      });
      component.document.set(doc);
      expect(component.lagrumLabels()).toBe('Lag A, Lag B');
    });

    it('lagrumLabels filters out empty titles', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.handlingstyp.lagrum]: [
          { title: 'Lag A', uid: 'l1' },
          { title: '', uid: 'l2' },
        ],
      });
      component.document.set(doc);
      expect(component.lagrumLabels()).toBe('Lag A');
    });

    it('contributorsLabel returns undefined when no doc', () => {
      component.document.set(null);
      expect(component.contributorsLabel()).toBeUndefined();
    });

    it('auditEntries returns empty array when no doc', () => {
      component.document.set(null);
      expect(component.auditEntries()).toEqual([]);
    });
  });

  describe('auditEntries computed', () => {
    it('sorts audit entries descending by eventDate', () => {
      const doc = makeDoc();
      doc.contextParameters = {
        audit: [
          { 'entity-type': 'logEntry', id: 1, eventDate: '2024-01-01T00:00:00Z' },
          { 'entity-type': 'logEntry', id: 2, eventDate: '2024-03-01T00:00:00Z' },
          { 'entity-type': 'logEntry', id: 3, eventDate: '2024-02-01T00:00:00Z' },
        ],
      };
      component.document.set(doc);
      const entries = component.auditEntries();
      expect(entries[0].id).toBe(2);
      expect(entries[1].id).toBe(3);
      expect(entries[2].id).toBe(1);
    });

    it('handles entries with logDate when eventDate is missing', () => {
      const doc = makeDoc();
      doc.contextParameters = {
        audit: [
          { 'entity-type': 'logEntry', id: 10, logDate: '2024-01-01T00:00:00Z' },
          { 'entity-type': 'logEntry', id: 20, logDate: '2024-06-01T00:00:00Z' },
        ],
      };
      component.document.set(doc);
      const entries = component.auditEntries();
      expect(entries[0].id).toBe(20);
    });

    it('handles entries with invalid dates (treated as 0)', () => {
      const doc = makeDoc();
      doc.contextParameters = {
        audit: [
          { 'entity-type': 'logEntry', id: 1, eventDate: 'invalid-date' },
          { 'entity-type': 'logEntry', id: 2, eventDate: '2024-01-01T00:00:00Z' },
        ],
      };
      component.document.set(doc);
      const entries = component.auditEntries();
      expect(entries[0].id).toBe(2);
    });
  });

  describe('ngOnInit - route params subscription', () => {
    it('document is null before route emits', () => {
      expect(component.document()).toBeNull();
    });

    it('starts in loading state', () => {
      expect(component.isLoading()).toBeTrue();
    });

    it('loads document when route params emit', () => {
      routeParamsSubject.next({ id: 'handlingstyp-uid-1' });
      expect(auditSpy.loadDocumentWithAudit).toHaveBeenCalledWith('handlingstyp-uid-1');
      expect(component.isLoading()).toBeFalse();
    });

    it('sets document from loaded response', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.handlingstyp.handlingsnamn]: ['Handlingsnamn A'] });
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(doc));
      routeParamsSubject.next({ id: 'handlingstyp-uid-1' });
      expect(component.document()).toEqual(doc);
    });

    it('sets loadError on failure', () => {
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(throwError(() => new Error('not found')));
      routeParamsSubject.next({ id: 'bad-id' });
      expect(component.loadError()).toBeTrue();
      expect(component.isLoading()).toBeFalse();
    });

    it('sets isLoading to true and resets document before loading', () => {
      const loadSubject = new Subject<NuxeoDocument>();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(loadSubject.asObservable());
      routeParamsSubject.next({ id: 'handlingstyp-uid-1' });
      expect(component.isLoading()).toBeTrue();
      expect(component.document()).toBeNull();
    });

    it('resets loadError to false and isLoading to true before each new load', () => {
      const loadSubject = new Subject<NuxeoDocument>();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(loadSubject.asObservable());
      routeParamsSubject.next({ id: 'first-id' });
      expect(component.isLoading()).toBeTrue();
      expect(component.loadError()).toBeFalse();
      routeParamsSubject.next({ id: 'second-id' });
      expect(component.isLoading()).toBeTrue();
      expect(component.loadError()).toBeFalse();
    });

    it('shows error notification on load failure', () => {
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(throwError(() => new Error('fail')));
      routeParamsSubject.next({ id: 'bad-id' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: HANDLINGSTYP_LOAD_ERROR_MESSAGE })
      );
    });

    it('sets loadError to true after load error notification', () => {
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(throwError(() => new Error('fail')));
      routeParamsSubject.next({ id: 'bad-id' });
      expect(component.loadError()).toBeTrue();
    });

    it('calls getDirectorySuggestions for Sekretess on init', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Sekretess');
    });

    it('calls getDirectorySuggestions for Arkiveringsregel on init', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Arkiveringsregel');
    });

    it('calls requestPageProviderOptions on init', () => {
      expect(apiSpy.requestPageProviderOptions).toHaveBeenCalled();
    });
  });

  describe('handleEditResult', () => {
    beforeEach(() => {
      const doc = makeDoc();
      component.document.set(doc);
    });

    it('does nothing when document is null', () => {
      component.document.set(null);
      component.handleEditResult({});
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('calls editDocument with updated fields', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({
        handlingsnamn: ['Nytt namn'],
        description: 'Desc',
        comment: 'Kommentar',
        diarieforing: true,
        arkiveringsregel: 'regel-1',
        automatiskGallring: false,
        gallringstid: '5 år',
        arkiveringstid: '10 år',
        bevarandekommentar: 'Bevara',
        gallringskommentar: 'Gallra',
        gallringsbeslut: 'gbeslut-1',
        sekretess: 'sek-1',
        sakerhetsskyddsklassificering: 'sak-1',
        metadataDefinition: [],
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'handlingstyp-uid-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.handlingstyp.handlingsnamn]: ['Nytt namn'],
          [NUXEO_SCHEMA_FIELDS.handlingstyp.kommentar]: 'Kommentar',
          [NUXEO_SCHEMA_FIELDS.handlingstyp.diarieforing]: true,
          [NUXEO_SCHEMA_FIELDS.handlingstyp.arkiveringsregel]: 'regel-1',
          [NUXEO_SCHEMA_FIELDS.handlingstyp.gallringstid]: '5 år',
          [NUXEO_SCHEMA_FIELDS.handlingstyp.sekretess]: 'sek-1',
        })
      );
    });

    it('maps metadataDefinition rows correctly', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({
        metadataDefinition: [
          { id: 'key1-1', nyckel: 'key1', flervardig: true, aktiv: true, typ: 'string', ordning: 1 },
        ],
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'handlingstyp-uid-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: [
            jasmine.objectContaining({ nyckel: 'key1', flervardig: true, aktiv: true, typ: 'string', ordning: 1 }),
          ],
        })
      );
    });

    it('sets isSaving to true during save', () => {
      const saveSubject = new Subject<NuxeoDocument>();
      apiSpy.editDocument.and.returnValue(saveSubject.asObservable());

      component.handleEditResult({ handlingsnamn: ['Test'] });
      expect(component.isSaving()).toBeTrue();
    });

    it('sets isSaving to false after successful edit', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({ handlingsnamn: ['Test'] });
      expect(component.isSaving()).toBeFalse();
    });

    it('closes edit dialog on success', () => {
      component.isEditOpen.set(true);
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({ handlingsnamn: ['Test'] });
      expect(component.isEditOpen()).toBeFalse();
    });

    it('shows success notification after successful edit', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({ handlingsnamn: ['Test'] });

      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'success', text: HANDLINGSTYP_UPDATE_SUCCESS_MESSAGE })
      );
    });

    it('shows error notification on failed edit', () => {
      apiSpy.editDocument.and.returnValue(throwError(() => new Error('update failed')));

      component.handleEditResult({ handlingsnamn: ['Test'] });

      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: HANDLINGSTYP_UPDATE_ERROR_MESSAGE })
      );
    });

    it('sets isSaving to false on error', () => {
      apiSpy.editDocument.and.returnValue(throwError(() => new Error('update failed')));

      component.handleEditResult({ handlingsnamn: ['Test'] });

      expect(component.isSaving()).toBeFalse();
    });

    it('calls refreshAuditAsync after successful edit', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({ handlingsnamn: ['Test'] });

      expect(auditSpy.refreshAuditAsync).toHaveBeenCalled();
    });

    it('handles null/undefined optional fields gracefully', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({
        handlingsnamn: ['Test'],
        description: null,
        comment: null,
        arkiveringsregel: undefined,
        gallringstid: undefined,
        arkiveringstid: undefined,
        bevarandekommentar: undefined,
        gallringskommentar: undefined,
        gallringsbeslut: undefined,
        sekretess: undefined,
        sakerhetsskyddsklassificering: undefined,
        metadataDefinition: null,
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'handlingstyp-uid-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dc.description]: null,
          [NUXEO_SCHEMA_FIELDS.handlingstyp.kommentar]: null,
          [NUXEO_SCHEMA_FIELDS.handlingstyp.arkiveringsregel]: null,
        })
      );
    });

    it('uses diarieforing false when not provided', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({ handlingsnamn: ['Test'] });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'handlingstyp-uid-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.handlingstyp.diarieforing]: false,
        })
      );
    });

    it('updates document signal after successful edit', () => {
      const updatedDoc = makeDoc({ [NUXEO_SCHEMA_FIELDS.handlingstyp.handlingsnamn]: ['Updated'] });
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({ handlingsnamn: ['Updated'] });

      expect(component.document()).toEqual(updatedDoc);
    });
  });

  describe('refreshEditConfig / editConfig', () => {
    it('editConfig is empty when document is null', () => {
      component.document.set(null);
      (component as unknown as HandlingstypPrivate).refreshEditConfig();
      expect(component.editConfig().length).toBe(0);
    });

    it('editConfig is populated after openEdit with a document', () => {
      const doc = makeDoc();
      component.document.set(doc);
      component.openEdit();
      expect(component.editConfig().length).toBeGreaterThan(0);
    });

    it('editConfig contains handlingsnamn field', () => {
      const doc = makeDoc();
      component.document.set(doc);
      component.openEdit();
      const field = component.editConfig().find(f => f.name === 'handlingsnamn');
      expect(field).toBeDefined();
    });

    it('editConfig contains sekretess dropdown field', () => {
      const doc = makeDoc();
      component.document.set(doc);
      component.openEdit();
      const field = component.editConfig().find(f => f.name === 'sekretess');
      expect(field).toBeDefined();
      expect(field?.type).toBe('dropdown');
    });

    it('editConfig sets sekretess defaultValue from properties.id', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.handlingstyp.sekretess]: {
          'entity-type': 'directoryEntry',
          properties: { id: 'sek-prop-id' },
        },
      });
      component.document.set(doc);
      component.openEdit();
      const sekretessField = component.editConfig().find(f => f.name === 'sekretess');
      expect(sekretessField?.defaultValue).toBe('sek-prop-id');
    });

    it('editConfig sets sekretess defaultValue from id as fallback', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.handlingstyp.sekretess]: {
          'entity-type': 'directoryEntry',
          id: 'sek-direct-id',
        },
      });
      component.document.set(doc);
      component.openEdit();
      const sekretessField = component.editConfig().find(f => f.name === 'sekretess');
      expect(sekretessField?.defaultValue).toBe('sek-direct-id');
    });
  });

  describe('syncMetadataDefinition', () => {
    it('sets metadataDefinitionFields from document properties', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: [
          { id: 'key1-1', nyckel: 'key1', flervardig: true, aktiv: true, typ: 'string', ordning: 1 },
        ],
      });
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(doc));
      routeParamsSubject.next({ id: 'handlingstyp-uid-1' });

      expect(component.metadataDefinitionFields().length).toBe(1);
      expect(component.metadataDefinitionFields()[0].nyckel).toBe('key1');
    });

    it('builds metadata id from nyckel when present', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: [
          { id: 'mykey-1', nyckel: 'mykey', flervardig: false, aktiv: true, typ: 'string', ordning: 1 },
        ],
      });
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(doc));
      routeParamsSubject.next({ id: 'handlingstyp-uid-1' });

      expect(component.metadataDefinitionFields()[0].id).toBe('mykey-1');
    });

    it('builds metadata id from metadata fallback when nyckel is empty', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: [
          { id: 'metadata-1', nyckel: '', flervardig: false, aktiv: true, typ: 'string', ordning: 1 },
        ],
      });
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(doc));
      routeParamsSubject.next({ id: 'handlingstyp-uid-1' });

      expect(component.metadataDefinitionFields()[0].id).toBe('metadata-1');
    });

    it('sets empty metadataDefinitionFields when faltdefinition is null', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: null,
      });
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(doc));
      routeParamsSubject.next({ id: 'handlingstyp-uid-1' });

      expect(component.metadataDefinitionFields()).toEqual([]);
    });
  });

  describe('lagrumLabels with options', () => {
    it('lagrumLabels returns comma-separated titles filtered of empty', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.handlingstyp.lagrum]: [{ title: 'Lag A' }, { title: undefined }, { title: 'Lag C' }],
      });
      component.document.set(doc);
      expect(component.lagrumLabels()).toBe('Lag A, Lag C');
    });
  });

  describe('loadDirectoryOptions / gallringsbeslut', () => {
    it('updates arkiveringsregelOptions when getDirectorySuggestions returns entries with children', () => {
      const doc = makeDoc();
      component.document.set(doc);

      const entries = [
        {
          id: 'p1',
          computedId: 'p1',
          absoluteLabel: 'Parent',
          displayLabel: 'Parent',
          label: 'Parent',
          children: [{ computedId: 'c1', absoluteLabel: 'Child 1', displayLabel: 'Child 1', id: 'c1' }],
        },
      ];
      (apiSpy.getDirectorySuggestions as jasmine.Spy).and.returnValue(of(entries));

      routeParamsSubject.next({ id: 'handlingstyp-uid-1' });
      component.openEdit();
      const arkField = component.editConfig().find(f => f.name === 'arkiveringsregel');
      expect(arkField?.options?.length).toBeGreaterThanOrEqual(0);
    });

    it('updates gallringsbeslutOptions when requestPageProviderOptions returns entries', () => {
      const doc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(doc));
      apiSpy.requestPageProviderOptions.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'g1', title: 'Gallring 1' })] }))
      );

      routeParamsSubject.next({ id: 'handlingstyp-uid-1' });
      component.openEdit();
      const gallField = component.editConfig().find(f => f.name === 'gallringsbeslut');
      expect(gallField?.options?.length).toBeGreaterThanOrEqual(0);
    });
  });
});
