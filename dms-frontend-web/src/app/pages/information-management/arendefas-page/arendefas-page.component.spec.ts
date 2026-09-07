import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ArendefasPageComponent } from './arendefas-page.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';

type ArendefasDoc = NonNullable<Parameters<ArendefasPageComponent['document']['set']>[0]>;

describe('ArendefasPageComponent', () => {
  let component: ArendefasPageComponent;
  let fixture: ComponentFixture<ArendefasPageComponent>;
  let routeParams$: Subject<{ id: string }>;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;
  let auditRefreshSpy: jasmine.SpyObj<AuditRefreshService>;
  let storeSpy: jasmine.SpyObj<GeneralStore>;

  beforeEach(async () => {
    routeParams$ = new Subject();
    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getDocumentById',
      'getPathInfo',
      'editDocument',
      'getMessagesJSON',
    ]);
    nuxeoApiSpy.getMessagesJSON.and.returnValue(of({}));

    auditRefreshSpy = jasmine.createSpyObj('AuditRefreshService', [
      'loadDocumentWithAudit',
      'refreshAuditAsync',
      'getLatestAuditTimestamp',
    ]);
    auditRefreshSpy.loadDocumentWithAudit.and.returnValue(new Subject());
    auditRefreshSpy.getLatestAuditTimestamp.and.returnValue(0);

    storeSpy = jasmine.createSpyObj('GeneralStore', ['getValue', 'getLabelByType'], {
      navigationPanelContext: () => null,
      notification: { set: jasmine.createSpy('set') },
      messagesInfo: () => null,
    });
    storeSpy.getValue.and.returnValue(undefined);

    await TestBed.configureTestingModule({
      imports: [ArendefasPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: routeParams$.asObservable() } },
        { provide: NuxeoApiService, useValue: nuxeoApiSpy },
        { provide: AuditRefreshService, useValue: auditRefreshSpy },
        { provide: GeneralStore, useValue: storeSpy },
      ],
    })
      .overrideTemplate(ArendefasPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ArendefasPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isLoading', () => {
    it('starts as true', () => {
      expect(component.isLoading()).toBeTrue();
    });
  });

  describe('openEdit / closeEdit', () => {
    it('openEdit sets isEditOpen to true', () => {
      component.openEdit();
      expect(component.isEditOpen()).toBeTrue();
    });

    it('closeEdit sets isEditOpen to false', () => {
      component.openEdit();
      component.closeEdit();
      expect(component.isEditOpen()).toBeFalse();
    });
  });

  describe('canEdit', () => {
    it('returns true when navigationPanelContext is not browse', () => {
      expect(component.canEdit()).toBeTrue();
    });
  });

  describe('props', () => {
    it('returns empty object when document is null', () => {
      component.document.set(null);
      expect(component.props()).toEqual(Object.create(null));
    });

    it('returns document properties when document is set', () => {
      const doc = makeNuxeoDocument({ uid: 'doc-1', properties: { 'cv:kod': 'K01' } });
      component.document.set(doc as unknown as ArendefasDoc);
      expect(component.props()['cv:kod']).toBe('K01');
    });
  });

  describe('canEdit', () => {
    it('returns true when navigationPanelContext returns non-browse value', () => {
      expect(component.canEdit()).toBeTrue();
    });
  });

  describe('submitEdit', () => {
    it('calls generalForm.submit when generalForm is defined', () => {
      const mockForm = jasmine.createSpyObj('GeneralFormComponent', ['submit']);
      (component as unknown as { generalForm: GeneralFormComponent }).generalForm =
        mockForm as unknown as GeneralFormComponent;
      component.submitEdit();
      expect(mockForm.submit).toHaveBeenCalled();
    });

    it('does not throw when generalForm is undefined', () => {
      (component as unknown as { generalForm: GeneralFormComponent | undefined }).generalForm = undefined;
      expect(() => component.submitEdit()).not.toThrow();
    });
  });

  describe('handleEditResult', () => {
    const baseDoc = () =>
      makeNuxeoDocument({
        uid: 'arendefas-1',
        title: 'Test',
        properties: {},
      });

    it('does nothing when document is null', () => {
      component.document.set(null);
      component.handleEditResult({});
      expect(nuxeoApiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('calls editDocument when document is set', () => {
      component.document.set(baseDoc() as unknown as ArendefasDoc);
      nuxeoApiSpy.editDocument.and.returnValue(of(baseDoc()));
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(baseDoc()));
      auditRefreshSpy.refreshAuditAsync.and.returnValue(of(baseDoc()));

      component.handleEditResult({
        title: 'New Title',
        code: 'CODE',
        shortName: 'SN',
      });

      expect(nuxeoApiSpy.editDocument).toHaveBeenCalledWith('arendefas-1', jasmine.any(Object));
    });

    it('computes title from code + shortName when title is not provided', () => {
      component.document.set(baseDoc() as unknown as ArendefasDoc);
      nuxeoApiSpy.editDocument.and.returnValue(of(baseDoc()));
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(baseDoc()));
      auditRefreshSpy.refreshAuditAsync.and.returnValue(of(baseDoc()));

      component.handleEditResult({ code: 'C01', shortName: 'Short' });

      const callArgs = nuxeoApiSpy.editDocument.calls.mostRecent().args[1] as Record<string, unknown>;
      expect(callArgs['dc:title']).toBe('C01 Short');
    });

    it('falls back to doc.title when code or shortName are empty', () => {
      const doc = makeNuxeoDocument({ uid: 'x', title: 'Original Title', properties: {} });
      component.document.set(doc as unknown as ArendefasDoc);
      nuxeoApiSpy.editDocument.and.returnValue(of(doc));
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(doc));
      auditRefreshSpy.refreshAuditAsync.and.returnValue(of(doc));

      component.handleEditResult({ code: '', shortName: '' });

      const callArgs = nuxeoApiSpy.editDocument.calls.mostRecent().args[1] as Record<string, unknown>;
      expect(callArgs['dc:title']).toBe('Original Title');
    });

    it('passes dateFrom and dateTill from event arrays', () => {
      component.document.set(baseDoc() as unknown as ArendefasDoc);
      nuxeoApiSpy.editDocument.and.returnValue(of(baseDoc()));
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(baseDoc()));
      auditRefreshSpy.refreshAuditAsync.and.returnValue(of(baseDoc()));

      const dateFrom = new Date('2024-01-01');
      const dateTill = new Date('2024-12-31');
      component.handleEditResult({ dateFrom: [dateFrom], dateTill: [dateTill] });

      const callArgs = nuxeoApiSpy.editDocument.calls.mostRecent().args[1] as Record<string, unknown>;
      expect(callArgs['cv:giltigFran']).toEqual(dateFrom);
      expect(callArgs['cv:giltigTill']).toEqual(dateTill);
    });

    it('shows success notification after save', () => {
      component.document.set(baseDoc() as unknown as ArendefasDoc);
      nuxeoApiSpy.editDocument.and.returnValue(of(baseDoc()));
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(baseDoc()));
      auditRefreshSpy.refreshAuditAsync.and.returnValue(of(baseDoc()));

      component.handleEditResult({ title: 'Updated' });

      expect((storeSpy as unknown as { notification: { set: jasmine.Spy } }).notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'success' })
      );
    });

    it('shows error notification on save failure', () => {
      component.document.set(baseDoc() as unknown as ArendefasDoc);
      nuxeoApiSpy.editDocument.and.returnValue(throwError(() => new Error('fail')));

      component.handleEditResult({ title: 'Bad' });

      expect((storeSpy as unknown as { notification: { set: jasmine.Spy } }).notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger' })
      );
    });
  });

  describe('contributorsLabel computed', () => {
    it('returns empty/undefined when document is null', () => {
      component.document.set(null);
      expect(component.contributorsLabel()).toBeUndefined();
    });

    it('returns formatted contributor names', () => {
      const doc = makeNuxeoDocument({
        uid: 'doc-1',
        properties: {
          'dc:contributors': [{ id: 'user1', properties: { firstName: 'Alice', lastName: 'Smith' } }],
        },
      });
      component.document.set(doc as unknown as ArendefasDoc);
      const label = component.contributorsLabel();
      expect(typeof label).toBe('string');
    });
  });

  describe('openEdit builds config from document props', () => {
    it('sets editConfig with fields when document is set', () => {
      const doc = makeNuxeoDocument({
        uid: 'doc-2',
        title: 'Arendefas Test',
        properties: {
          'cv:kod': 'K01',
          'cv:kodnamn': 'Kod 1',
          'cv:kortnamn': 'KN',
          'cv:namn': 'Namn',
          'cv:sortering': 1,
          'cv:giltigFran': '2024-01-01',
          'cv:giltigTill': '2024-12-31',
        },
      });
      component.document.set(doc as unknown as ArendefasDoc);
      component.openEdit();
      expect(component.editConfig().length).toBeGreaterThan(0);
      const names = component.editConfig().map(f => f.name);
      expect(names).toContain('code');
      expect(names).toContain('shortName');
    });
  });
});
