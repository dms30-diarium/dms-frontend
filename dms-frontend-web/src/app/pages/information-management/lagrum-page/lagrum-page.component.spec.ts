import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { LagrumPageComponent } from './lagrum-page.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

describe('LagrumPageComponent', () => {
  let component: LagrumPageComponent;
  let fixture: ComponentFixture<LagrumPageComponent>;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;
  let auditRefreshSpy: jasmine.SpyObj<AuditRefreshService>;
  let storeSpy: jasmine.SpyObj<GeneralStore>;
  let routeParams$: Subject<{ id: string }>;
  let auditSubject$: Subject<ReturnType<typeof makeNuxeoDocument>>;

  beforeEach(async () => {
    routeParams$ = new Subject();
    auditSubject$ = new Subject();

    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'editDocument']);
    nuxeoApiSpy.getMessagesJSON.and.returnValue(of({}));
    nuxeoApiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));

    auditRefreshSpy = jasmine.createSpyObj('AuditRefreshService', [
      'loadDocumentWithAudit',
      'getLatestAuditTimestamp',
      'refreshAuditAsync',
    ]);
    auditRefreshSpy.loadDocumentWithAudit.and.returnValue(auditSubject$);
    auditRefreshSpy.getLatestAuditTimestamp.and.returnValue(0);
    auditRefreshSpy.refreshAuditAsync.and.returnValue(of(makeNuxeoDocument()));

    storeSpy = jasmine.createSpyObj('GeneralStore', ['getValue'], {
      navigationPanelContext: () => null,
      notification: { set: jasmine.createSpy('set') },
      messagesInfo: () => null,
    });
    storeSpy.getValue.and.returnValue(undefined);

    await TestBed.configureTestingModule({
      imports: [LagrumPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: routeParams$ } },
        { provide: NuxeoApiService, useValue: nuxeoApiSpy },
        { provide: AuditRefreshService, useValue: auditRefreshSpy },
        { provide: GeneralStore, useValue: storeSpy },
      ],
    })
      .overrideTemplate(LagrumPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(LagrumPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts loading', () => {
    expect(component.isLoading()).toBeTrue();
  });

  it('openEdit sets isEditOpen to true', () => {
    component.openEdit();
    expect(component.isEditOpen()).toBeTrue();
  });

  it('closeEdit sets isEditOpen to false', () => {
    component.openEdit();
    component.closeEdit();
    expect(component.isEditOpen()).toBeFalse();
  });

  it('document is null before route emits', () => {
    expect(component.document()).toBeNull();
  });

  it('sets document and clears isLoading when route emits and audit resolves', () => {
    const doc = makeNuxeoDocument({ uid: 'uid-1', properties: { 'lagrum:kod': 'L1' } });
    routeParams$.next({ id: 'uid-1' });
    auditSubject$.next(doc);
    expect(component.document()).toEqual(doc);
    expect(component.isLoading()).toBeFalse();
  });

  it('detailItems returns items from document properties with cv: schema', () => {
    const doc = makeNuxeoDocument({
      uid: 'uid-1',
      properties: { 'cv:kod': 'CV1', 'dc:title': 'Lagrum Title' },
    });
    routeParams$.next({ id: 'uid-1' });
    auditSubject$.next(doc);
    const items = component.detailItems();
    expect(items.length).toBeGreaterThan(0);
    const kodItem = items.find(i => i.label === 'Kod');
    expect(kodItem?.value).toBe('CV1');
  });

  it('detailItems falls back to lagrum: props when cv: schema is absent', () => {
    const doc = makeNuxeoDocument({
      uid: 'uid-1',
      properties: { 'lagrum:kod': 'L1' } as Record<string, unknown>,
    });
    routeParams$.next({ id: 'uid-1' });
    auditSubject$.next(doc);
    const items = component.detailItems();
    const kodItem = items.find(i => i.label === 'Kod');
    expect(kodItem?.value).toBe('L1');
  });

  it('canEdit is true when navigationPanelContext is null', () => {
    expect(component.canEdit()).toBeTrue();
  });

  it('canEdit is false when navigationPanelContext is browse', () => {
    Object.defineProperty(storeSpy, 'navigationPanelContext', { value: () => 'browse', writable: true });
    expect(component.canEdit()).toBeFalse();
  });

  it('handleEditResult does nothing when document is null', () => {
    component.handleEditResult({});
    expect(nuxeoApiSpy.editDocument).not.toHaveBeenCalled();
  });

  it('handleEditResult calls editDocument with cv: key when cv: prop is defined', () => {
    const doc = makeNuxeoDocument({
      uid: 'uid-1',
      properties: { 'cv:kod': 'CV1' } as Record<string, unknown>,
    });
    routeParams$.next({ id: 'uid-1' });
    auditSubject$.next(doc);

    auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(doc));

    component.handleEditResult({ code: 'CV2' });
    expect(nuxeoApiSpy.editDocument).toHaveBeenCalledWith('uid-1', jasmine.objectContaining({ 'cv:kod': 'CV2' }));
  });

  it('handleEditResult uses lagrum: fallback when cv: prop is undefined', () => {
    const doc = makeNuxeoDocument({
      uid: 'uid-1',
      properties: { 'lagrum:kod': 'L1' } as Record<string, unknown>,
    });
    routeParams$.next({ id: 'uid-1' });
    auditSubject$.next(doc);

    auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(doc));

    component.handleEditResult({ code: 'L2' });
    expect(nuxeoApiSpy.editDocument).toHaveBeenCalledWith('uid-1', jasmine.objectContaining({ 'lagrum:kod': 'L2' }));
  });

  it('saveVocabDocument shows success notification after successful edit', () => {
    const doc = makeNuxeoDocument({ uid: 'uid-1', properties: { 'cv:kod': 'CV1' } as Record<string, unknown> });
    routeParams$.next({ id: 'uid-1' });
    auditSubject$.next(doc);

    auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(doc));

    component.handleEditResult({ code: 'CV2' });
    expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
  });

  it('saveVocabDocument shows error notification when editDocument fails', () => {
    const doc = makeNuxeoDocument({ uid: 'uid-1', properties: { 'cv:kod': 'CV1' } as Record<string, unknown> });
    routeParams$.next({ id: 'uid-1' });
    auditSubject$.next(doc);

    nuxeoApiSpy.editDocument.and.returnValue(throwError(() => new Error('save failed')));

    component.handleEditResult({ code: 'CV2' });
    expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
  });
});
