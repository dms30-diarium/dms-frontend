import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { KlassPageComponent } from './klass-page.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { makeNuxeoDocument, makeSearchResult, makeAuditLogEntries } from '@app/shared/testing/mock-factories';
import { KlassProperties } from './types';
import { NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';

interface KlassPrivate {
  generalForm: { submit: () => void } | undefined;
}
import {
  KLASS_LOAD_ERROR_MESSAGE,
  KLASS_LOAD_OPTIONS_ERROR_MESSAGE,
  KLASS_UPDATE_ERROR_MESSAGE,
  KLASS_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

function makeStoreMock() {
  return {
    openPage: signal<string | null>(null),
    lastCreatedCase: signal<ReturnType<typeof makeNuxeoDocument> | null>(null),
    notification: { set: jasmine.createSpy('set') },
    baseButtons: signal<unknown[]>([]),
    navigationPanelContext: signal<'browse' | 'info' | null>(null),
    messagesInfo: signal<unknown>(null),
    getValue: jasmine.createSpy('getValue').and.returnValue(null),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(''),
    getLabelByType: jasmine.createSpy('getLabelByType').and.returnValue(''),
  };
}

function makeDoc(overrides: Record<string, unknown> = {}) {
  return makeNuxeoDocument<KlassProperties>({
    uid: 'klass-1',
    title: 'Test Klass',
    type: 'Klass',
    path: '/default-domain/classes/test',
    parentRef: 'parent-uid-1',
    state: 'project',
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Klass',
      [NUXEO_SCHEMA_FIELDS.dc.contributors]: [],
      ...overrides,
    } as unknown as KlassProperties,
    contextParameters: {},
  });
}

describe('KlassPageComponent', () => {
  let component: KlassPageComponent;
  let fixture: ComponentFixture<KlassPageComponent>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let auditSpy: jasmine.SpyObj<AuditRefreshService>;
  let formUtilsSpy: jasmine.SpyObj<FormUtilsService>;
  let routeParamsSubject: Subject<Record<string, string>>;

  beforeEach(async () => {
    storeMock = makeStoreMock();
    routeParamsSubject = new Subject();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'editDocument',
      'DMSDocumentSuggestion',
      'getLagrumOptions',
      'queryAuditEntries',
      'getDirectorySuggestions',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.getLagrumOptions.and.returnValue(of([]));
    apiSpy.queryAuditEntries.and.returnValue(of(makeAuditLogEntries()));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));

    auditSpy = jasmine.createSpyObj('AuditRefreshService', [
      'loadDocumentWithAudit',
      'getLatestAuditTimestamp',
      'refreshAuditAsync',
    ]);
    auditSpy.loadDocumentWithAudit.and.returnValue(of(makeDoc()));
    auditSpy.getLatestAuditTimestamp.and.returnValue(0);
    auditSpy.refreshAuditAsync.and.returnValue(of(makeDoc()));

    formUtilsSpy = jasmine.createSpyObj('FormUtilsService', ['hasStrongSecrecy']);
    formUtilsSpy.hasStrongSecrecy.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [KlassPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: AuditRefreshService, useValue: auditSpy },
        { provide: GeneralStore, useValue: storeMock },
        { provide: FormUtilsService, useValue: formUtilsSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParamsSubject.asObservable() },
        },
      ],
    })
      .overrideTemplate(KlassPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(KlassPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('canEdit', () => {
    it('returns true when navigationPanelContext is not browse', () => {
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

    it('openEdit with no document still sets isEditOpen to true', () => {
      component.document.set(null);
      component.openEdit();
      expect(component.isEditOpen()).toBeTrue();
    });

    it('openEdit with a document calls prepareEditState', () => {
      const doc = makeDoc();
      component.document.set(doc);
      component.openEdit();
      expect(component.isEditOpen()).toBeTrue();
    });
  });

  describe('computed labels from empty props', () => {
    it('klasstypLabel returns empty string when no klass doc', () => {
      expect(component.klasstypLabel()).toBe('');
    });

    it('ansvarigOrgLabel returns empty string when no doc', () => {
      expect(component.ansvarigOrgLabel()).toBe('');
    });

    it('bevarasLabel returns empty string when no doc', () => {
      expect(component.bevarasLabel()).toBe('');
    });

    it('sekretessLabel returns empty string when no doc', () => {
      expect(component.sekretessLabel()).toBe('');
    });

    it('sakerhetLabel returns empty string when no doc', () => {
      expect(component.sakerhetLabel()).toBe('');
    });

    it('fordelningsprincipLabel returns empty string when no doc', () => {
      expect(component.fordelningsprincipLabel()).toBe('');
    });

    it('checklistaLabel returns empty string when no doc', () => {
      expect(component.checklistaLabel()).toBe('');
    });

    it('beslutstyperLabels returns empty string when no doc', () => {
      expect(component.beslutstyperLabels()).toBe('');
    });

    it('beredningsbeslutstyperLabels returns empty string when no doc', () => {
      expect(component.beredningsbeslutstyperLabels()).toBe('');
    });

    it('handlingstyperLabels returns empty string when no doc', () => {
      expect(component.handlingstyperLabels()).toBe('');
    });

    it('lagrumLabels returns empty string when no doc', () => {
      expect(component.lagrumLabels()).toBe('');
    });

    it('contributorsLabel returns undefined when no doc', () => {
      expect(component.contributorsLabel()).toBeUndefined();
    });

    it('auditEntries returns empty array when no doc', () => {
      expect(component.auditEntries()).toEqual([]);
    });
  });

  describe('computed labels from document properties', () => {
    beforeEach(() => {
      component.document.set(
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.klass.klasstyp]: { title: 'Ärendetyp', uid: 'kt-1' },
          [NUXEO_SCHEMA_FIELDS.klass.ansvarigOrganisationsenhet]: { title: 'Enhet A', uid: 'org-1' },
          [NUXEO_SCHEMA_FIELDS.klass.bevarasGallras]: { properties: { label: 'Bevaras' } },
          [NUXEO_SCHEMA_FIELDS.klass.sekretess]: { properties: { label: 'Hemlig' } },
          [NUXEO_SCHEMA_FIELDS.klass.sakerhetsskyddsklassificering]: { properties: { label: 'Säkerhet' } },
          [NUXEO_SCHEMA_FIELDS.klass.fordelningsprincip]: { properties: { label: 'Fördelning' } },
          [NUXEO_SCHEMA_FIELDS.klass.checklista]: { title: 'Min checklista', uid: 'cl-1' },
          [NUXEO_SCHEMA_FIELDS.klass.beslutstyper]: [{ title: 'Beslut A' }, { title: 'Beslut B' }],
          [NUXEO_SCHEMA_FIELDS.klass.beredningsbeslutstyper]: [{ title: 'Beredning A' }],
          [NUXEO_SCHEMA_FIELDS.klass.handlingstyper]: [{ title: 'Handling A' }, { title: '' }],
          [NUXEO_SCHEMA_FIELDS.klass.lagrum]: [{ title: 'Lag A' }],
        })
      );
      fixture.detectChanges();
    });

    it('klasstypLabel returns title', () => {
      expect(component.klasstypLabel()).toBe('Ärendetyp');
    });

    it('ansvarigOrgLabel returns title', () => {
      expect(component.ansvarigOrgLabel()).toBe('Enhet A');
    });

    it('bevarasLabel returns label from properties', () => {
      expect(component.bevarasLabel()).toBe('Bevaras');
    });

    it('sekretessLabel returns label from properties', () => {
      expect(component.sekretessLabel()).toBe('Hemlig');
    });

    it('sakerhetLabel returns label from properties', () => {
      expect(component.sakerhetLabel()).toBe('Säkerhet');
    });

    it('fordelningsprincipLabel returns label from properties', () => {
      expect(component.fordelningsprincipLabel()).toBe('Fördelning');
    });

    it('checklistaLabel returns title', () => {
      expect(component.checklistaLabel()).toBe('Min checklista');
    });

    it('beslutstyperLabels joins titles', () => {
      expect(component.beslutstyperLabels()).toBe('Beslut A, Beslut B');
    });

    it('beredningsbeslutstyperLabels returns single title', () => {
      expect(component.beredningsbeslutstyperLabels()).toBe('Beredning A');
    });

    it('handlingstyperLabels filters out empty titles', () => {
      expect(component.handlingstyperLabels()).toBe('Handling A');
    });

    it('lagrumLabels returns title', () => {
      expect(component.lagrumLabels()).toBe('Lag A');
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
    it('loads document when route params emit', () => {
      routeParamsSubject.next({ id: 'klass-uid-1' });
      expect(auditSpy.loadDocumentWithAudit).toHaveBeenCalledWith('klass-uid-1');
      expect(component.isLoading()).toBeFalse();
    });

    it('sets document from loaded response', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.klass.kod]: 'K001' });
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(doc));
      routeParamsSubject.next({ id: 'klass-uid-1' });
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
      routeParamsSubject.next({ id: 'klass-uid-1' });
      expect(component.isLoading()).toBeTrue();
      expect(component.document()).toBeNull();
    });

    it('resets loadError to false and isLoading to true before each new load attempt', () => {
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
        jasmine.objectContaining({ variation: 'danger', text: KLASS_LOAD_ERROR_MESSAGE })
      );
    });
  });

  describe('handleEditResult', () => {
    beforeEach(() => {
      const doc = makeDoc();
      component.document.set(doc);
    });

    it('does nothing when document is null', () => {
      component.document.set(null);
      component.handleEditResult({ name: 'Test', code: 'T001' });
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('calls editDocument with updated fields', () => {
      const updatedDoc = makeDoc({ [NUXEO_SCHEMA_FIELDS.klass.kod]: 'K002' });
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({
        name: 'New Name',
        title: 'New Title',
        description: 'Desc',
        code: 'K002',
        klass: [{ id: 'klass-type-1' }],
        beslutstyper: [{ id: 'b1', label: 'Beslut 1' }],
        beredningsbeslutstyper: [{ id: 'bb1', label: 'BB 1' }],
        handlingstyper: [{ id: 'h1', label: 'Handling 1' }],
        lagrum: [{ id: 'l1', label: 'Lag 1' }],
        registrerbar: true,
        paJkListan: false,
        ansvarigOrg: 'org-1',
        fordelningsprincip: 'fp-1',
        checklista: 'cl-1',
        secretClass: 'sc-1',
        secret: 'sec-1',
        riktning: 'rikt-1',
        bevaras: 'bev-1',
        gallringsforeskrift: 'gall-1',
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith('klass-1', jasmine.any(Object));
    });

    it('sets isSaving to true during edit and false after success', () => {
      const saveSubject = new Subject<NuxeoDocument>();
      apiSpy.editDocument.and.returnValue(saveSubject.asObservable());

      component.handleEditResult({ name: 'Test', code: 'T001', klass: [{ id: 'kt-1' }] });
      expect(component.isSaving()).toBeTrue();

      saveSubject.next(makeNuxeoDocument());
      saveSubject.complete();
    });

    it('closes edit dialog on success', () => {
      component.isEditOpen.set(true);
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({ name: 'Test', code: 'T001', klass: [{ id: 'kt-1' }] });

      expect(component.isEditOpen()).toBeFalse();
    });

    it('shows success notification on successful edit', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({ name: 'Test', code: 'T001', klass: [{ id: 'kt-1' }] });

      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'success', text: KLASS_UPDATE_SUCCESS_MESSAGE })
      );
    });

    it('shows error notification on failed edit', () => {
      apiSpy.editDocument.and.returnValue(throwError(() => new Error('update failed')));

      component.handleEditResult({ name: 'Test', code: 'T001', klass: [{ id: 'kt-1' }] });

      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: KLASS_UPDATE_ERROR_MESSAGE })
      );
    });

    it('sets isSaving to false on error', () => {
      apiSpy.editDocument.and.returnValue(throwError(() => new Error('update failed')));

      component.handleEditResult({ name: 'Test', code: 'T001', klass: [{ id: 'kt-1' }] });

      expect(component.isSaving()).toBeFalse();
    });

    it('handles empty string values as null (ansvarigOrg, fordelningsprincip, etc.)', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({
        name: 'Test',
        code: 'T001',
        klass: [{ id: 'kt-1' }],
        ansvarigOrg: '',
        fordelningsprincip: '',
        checklista: '',
        secretClass: '',
        secret: '',
        riktning: '',
        bevaras: '',
        gallringsforeskrift: '',
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'klass-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.klass.ansvarigOrganisationsenhet]: null,
          [NUXEO_SCHEMA_FIELDS.klass.fordelningsprincip]: null,
          [NUXEO_SCHEMA_FIELDS.klass.checklista]: null,
          [NUXEO_SCHEMA_FIELDS.klass.sakerhetsskyddsklassificering]: null,
          [NUXEO_SCHEMA_FIELDS.klass.sekretess]: null,
          [NUXEO_SCHEMA_FIELDS.klass.riktning]: null,
          [NUXEO_SCHEMA_FIELDS.klass.bevarasGallras]: null,
          [NUXEO_SCHEMA_FIELDS.klass.gallringsforeskrift]: null,
        })
      );
    });

    it('computes title from code and name when both are present', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({
        name: 'My Name',
        code: 'K001',
        klass: [{ id: 'kt-1' }],
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'klass-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'K001 My Name',
        })
      );
    });

    it('uses provided title when explicitly set', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({
        title: 'Explicit Title',
        name: 'My Name',
        code: 'K001',
        klass: [{ id: 'kt-1' }],
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'klass-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'Explicit Title',
        })
      );
    });

    it('uses doc.title as fallback when code or name is missing', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({
        name: '',
        code: '',
        klass: [{ id: 'kt-1' }],
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'klass-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Klass',
        })
      );
    });

    it('maps beslutstyper options to ids', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({
        name: 'Test',
        code: 'T001',
        klass: [{ id: 'kt-1' }],
        beslutstyper: [
          { id: 'b1', label: 'Beslut 1' },
          { id: 'b2', label: 'Beslut 2' },
        ],
        beredningsbeslutstyper: [{ id: 'bb1', label: 'BB 1' }],
        handlingstyper: [{ id: 'h1', label: 'H 1' }],
        lagrum: [{ id: 'l1', label: 'Lag 1' }],
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'klass-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.klass.beslutstyper]: ['b1', 'b2'],
          [NUXEO_SCHEMA_FIELDS.klass.beredningsbeslutstyper]: ['bb1'],
          [NUXEO_SCHEMA_FIELDS.klass.handlingstyper]: ['h1'],
          [NUXEO_SCHEMA_FIELDS.klass.lagrum]: ['l1'],
        })
      );
    });

    it('calls refreshAuditAsync after successful edit', () => {
      const updatedDoc = makeDoc();
      (auditSpy.loadDocumentWithAudit as jasmine.Spy).and.returnValue(of(updatedDoc));

      component.handleEditResult({ name: 'Test', code: 'T001', klass: [{ id: 'kt-1' }] });

      expect(auditSpy.refreshAuditAsync).toHaveBeenCalled();
    });
  });

  describe('arendemeningChange', () => {
    it('updates the arendemening signal', () => {
      const newData = [{ id: 'am1', label: 'Test' }];
      component.arendemeningChange(newData);
      expect(component.arendemening()).toEqual(newData);
    });
  });

  describe('selectedOptionChanged', () => {
    it('ignores events for non-secret fields', () => {
      component.selectedOptionChanged({ selectedValue: 'val', fieldName: 'other' });
      expect(formUtilsSpy.hasStrongSecrecy).not.toHaveBeenCalled();
    });

    it('updates lagrum visibility when secret field changes', () => {
      const doc = makeDoc();
      component.document.set(doc);
      component.editConfig.set([
        { type: 'dropdown-search', name: 'lagrum', label: 'Lagrum', isHidden: true } as FieldConfig,
      ]);
      formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
      component.selectedOptionChanged({ selectedValue: 'strong-val', fieldName: 'secret' });
      expect(formUtilsSpy.hasStrongSecrecy).toHaveBeenCalledWith('strong-val');
      const lagrumField = component.editConfig().find(f => f.name === 'lagrum');
      expect(lagrumField?.isHidden).toBeFalse();
    });

    it('hides lagrum when secret does not have strong secrecy', () => {
      const doc = makeDoc();
      component.document.set(doc);
      component.editConfig.set([
        { type: 'dropdown-search', name: 'lagrum', label: 'Lagrum', isHidden: false } as FieldConfig,
      ]);
      formUtilsSpy.hasStrongSecrecy.and.returnValue(false);
      component.selectedOptionChanged({ selectedValue: 'weak-val', fieldName: 'secret' });
      const lagrumField = component.editConfig().find(f => f.name === 'lagrum');
      expect(lagrumField?.isHidden).toBeTrue();
    });
  });

  describe('getKlassDefault', () => {
    it('returns null when uid is empty', () => {
      expect(component.getKlassDefault('')).toBeNull();
    });

    it('returns matching options when uid is found in klasstypOptions', () => {
      component.klasstypOptions.set([
        { id: 'kt-1', label: 'Type 1' },
        { id: 'kt-2', label: 'Type 2' },
      ]);
      const result = component.getKlassDefault('kt-1');
      expect(result).toEqual([{ id: 'kt-1', label: 'Type 1' }]);
    });

    it('returns empty array when uid is not found in klasstypOptions', () => {
      component.klasstypOptions.set([{ id: 'kt-1', label: 'Type 1' }]);
      const result = component.getKlassDefault('kt-999');
      expect(result).toEqual([]);
    });
  });

  describe('updateDropdownValues', () => {
    it('does nothing when document has no parentRef', () => {
      component.document.set(makeNuxeoDocument<KlassProperties>({ parentRef: undefined }));
      component.updateDropdownValues({ fieldName: 'handlingstyper', value: 'search' });
      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    });

    it('fetches DMSDocumentSuggestion for handlingstyper field', () => {
      const doc = makeDoc();
      component.document.set(doc);
      const entries = [makeNuxeoDocument({ uid: 'h1', title: 'Handling 1', path: '/h1' })];
      apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries })));

      component.updateDropdownValues({ fieldName: 'handlingstyper', value: 'search' });

      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-uid-1', 'Handlingstyp', 'Klass', 'search');
      expect(component.handlingstyperOptions()).toEqual([{ id: 'h1', label: 'Handling 1', path: '/h1' }]);
    });

    it('fetches DMSDocumentSuggestion for beslutstyper field', () => {
      const doc = makeDoc();
      component.document.set(doc);
      const entries = [makeNuxeoDocument({ uid: 'b1', title: 'Beslut 1', path: '/b1' })];
      apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries })));

      component.updateDropdownValues({ fieldName: 'beslutstyper', value: 'search' });

      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-uid-1', 'Beslut', 'Klass', 'search');
      expect(component.beslutstyperOptions()).toEqual([{ id: 'b1', label: 'Beslut 1', path: '/b1' }]);
    });

    it('fetches DMSDocumentSuggestion for klass field', () => {
      const doc = makeDoc();
      component.document.set(doc);
      const entries = [makeNuxeoDocument({ uid: 'kt1', title: 'KlassTyp 1', path: '/kt1' })];
      apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries })));

      component.updateDropdownValues({ fieldName: 'klass', value: 'search' });

      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-uid-1', 'Klasstyp', 'Klass', 'search');
      expect(component.klasstypOptions()).toEqual([{ id: 'kt1', label: 'KlassTyp 1', path: '/kt1' }]);
    });

    it('ignores unknown fieldName values', () => {
      const doc = makeDoc();
      component.document.set(doc);
      component.updateDropdownValues({ fieldName: 'unknown', value: 'search' });
      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    });
  });

  describe('loadFormOptions - loadEditOptions error handling', () => {
    it('shows options error notification and clears options on DMSDocumentSuggestion failure', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(throwError(() => new Error('suggestion fail')));
      const doc = makeDoc();
      component.document.set(doc);
      component.openEdit();

      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: KLASS_LOAD_OPTIONS_ERROR_MESSAGE })
      );
      expect(component.beslutstyperOptions()).toEqual([]);
      expect(component.handlingstyperOptions()).toEqual([]);
      expect(component.klasstypOptions()).toEqual([]);
    });

    it('clears options when parentRef is missing', () => {
      const docNoParent = makeNuxeoDocument<KlassProperties>({
        uid: 'klass-2',
        path: '/path',
        properties: {} as KlassProperties,
        parentRef: undefined,
      });
      component.document.set(docNoParent);
      component.openEdit();

      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    });
  });

  describe('loadFormOptions - loadDirectoryOptions', () => {
    it('populates riktning, secretClass and bevaras options from directory suggestions', () => {
      const doc = makeDoc();
      component.document.set(doc);
      component.openEdit();

      expect(component.riktningOptions()).toEqual([]);
      expect(component.secretOptions()).toEqual([]);
      expect(component.secretClassOptions()).toEqual([]);
      expect(component.bevarasOptions()).toEqual([]);
      expect(component.fordelningsprincipOptions()).toEqual([]);
    });
  });

  describe('props computed', () => {
    it('returns empty object when document is null', () => {
      component.document.set(null);
      expect(component.props()).toEqual({});
    });

    it('returns document properties when document is set', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.klass.kod]: 'K001' });
      component.document.set(doc);
      expect((component.props() as NuxeoProperties)[NUXEO_SCHEMA_FIELDS.klass.kod]).toBe('K001');
    });
  });

  describe('submitEdit', () => {
    it('calls generalForm.submit when generalForm exists', () => {
      const mockForm = { submit: jasmine.createSpy('submit') };
      (component as unknown as KlassPrivate).generalForm = mockForm;
      component.submitEdit();
      expect(mockForm.submit).toHaveBeenCalled();
    });

    it('does not throw when generalForm is undefined', () => {
      (component as unknown as KlassPrivate).generalForm = undefined;
      expect(() => component.submitEdit()).not.toThrow();
    });
  });
});
