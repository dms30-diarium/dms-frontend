import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal, Type } from '@angular/core';

import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { AuthService } from '@app/core/services/auth.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { LagrumFieldService } from '@app/shared/services/lagrum-field.service';
import { DocumentVersionService } from '@app/core/services/document-version.service';
import { CommentsService } from '@app/core/services/comments.service';
import { FavoritesService } from '@app/core/services/favorites.service';
import { LockService } from '@app/core/services/lock-service.service';
import { NotificationService } from '@app/core/services/notification-service.service';
import { ShareLinkService } from '@app/core/services/share-link.service';
import { DocumentValueService } from '@app/core/services/document-value-service.service';
import { UserService } from '@app/core/services/users.service';
import { CasesService } from '@app/core/services/cases.service';
import { CustomMetadataService } from '@app/shared/services/custom-metadata.service';
import {
  AuditLogEntries,
  NuxeoDocument,
  NuxeoDocuments,
  SearchResult,
  TemplateSourceProperties,
  UserSuggestion,
} from '@app/shared/api/nuxeo-api.types';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';

import { CreateHandlingFromMail } from '@app/shared/components/forms/create-handling-from-mail/create-handling-from-mail.component';
import { DocumentPreviewComponent } from '@app/pages/media-views/document-preview/document-preview.component';
import { DocumentInfoPanelComponent } from '@app/shared/components/document-info-panel/document-info-panel.component';
import { EditFormComponent } from '@app/shared/components/edit-form/edit-form.component';
import { PictureViewComponent } from '@app/pages/media-views/picture-view/picture-view.component';
import { CollectionPermissionsComponent } from '@app/shared/components/collection-permissions/collection-permissions.component';
import { CreateHandlingFormComponent } from '@app/shared/components/forms/create-handling-form/create-handling-form.component';
import { VideoViewComponent } from '@app/pages/media-views/video-view/video-view.component';
import { CommentsComponent } from '@app/shared/components/comments/comments.component';
import { CreateReducedCaseFormComponent } from '@app/shared/components/forms/reduced-create-case-form/reduced-create-case-form.component';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { SelectCaseComponent } from '@app/shared/components/select-case-popup/select-case-popup.component';
import { CreateFileFormComponent } from '@app/shared/components/forms/create-file-form/create-file-form.component';
import { MailMessageComponent } from '@app/pages/mail-message-page/mail-message.component';
import { TableDateRangeFiltersComponent } from '@app/shared/components/table-date-range-filters/table-date-range-filters.component';
import { FileViewComponent } from '@app/pages/media-views/file-view/file-view.component';
import { ServiceNoteFormComponent } from '@app/shared/components/forms/service-note-form/service-note-form.component';
import { RequestCompletionEmailFormComponent } from '@app/shared/components/forms/request-completion-email-form/request-completion-email-form.component';
import { CustomMetadataEditComponent } from '@app/shared/components/edit-form-components/custom-metadata-edit/custom-metadata-edit.component';
import { DeliverPublicDocsFormComponent } from '@app/shared/components/forms/deliver-public-docs-form/deliver-public-docs-form.component';
import { PdfViewerComponent } from '@app/shared/components/pdf-viewer/pdf-viewer.component';
import { CaseReferenceComponent } from '@app/shared/components/edit-form-components/case-reference.component/case-reference.component';
import { SendEmailFormComponent } from '@app/shared/components/forms/send-email-form/send-email-form.component';
import { DownloadAllFilesComponent } from '@app/shared/components/download-all-files/download-all-files.component';
import { CreatePictureFormComponent } from '@app/shared/components/forms/create-picture-form/create-picture-form.component';
import { ReferencesDetailsComponent } from '@app/shared/components/references-details/references-details.component';
import { CreateAudioFormComponent } from '@app/shared/components/forms/create-audio-form/create-audio-form.component';
import { CreateVideoFormComponent } from '@app/shared/components/forms/create-video-form/create-video-form.component';
import { EntityOverviewComponent } from '@app/shared/components/entity-overview/entity-overview.component';
import { WorkflowComponent } from '@app/shared/components/workflow/workflow.component';
import { BasicMetaDataTableComponent } from '@app/shared/components/edit-form-components/basic-metadata-table/basic-metadata-table.component';
import { ExpeditHandlingComponent } from '@app/shared/components/forms/expedit-handling/expedit-handling.component';
import { ConsultColleagueFormComponent } from '@app/shared/components/forms/consult-colleague-form/consult-colleague-form.component';
import { CreateHandlingComponent } from '@app/shared/components/forms/create-handlingtype/create-handlingtype-form.component';
import { CreateChecklistComponent } from '@app/shared/components/forms/create-checklist/create-checklist.component';
import { CreateKlassificComponent } from '@app/shared/components/forms/create-klassific/create-klassific.component';
import { ContactTableComponent } from '@app/shared/components/edit-form-components/contact-table/contact-table.component';
import { CreateArkivFormComponent } from '@app/shared/components/forms/create-arkiv-form/create-arkiv-form.component';
import { SelectHandlingsComponent } from '@app/shared/components/forms/select-handlings/select-handlings.component';
import { CreateCollectionFormComponent } from '@app/shared/components/forms/create-collection-form/create-collection-form.component';
import { HandlingOverviewComponent } from '@app/shared/components/handling-overview/handling-overview.component';
import { CreateExportFormComponent } from '@app/shared/components/forms/create-export-form/create-export-form.component';

const documentFixture: NuxeoDocument = {
  'entity-type': 'document',
  repository: 'default',
  uid: 'doc-1',
  path: '/default-domain/workspaces/doc-1',
  type: 'File',
  name: 'doc-1',
  title: 'Document 1',
  isCheckedOut: true,
  isRecord: false,
  isTrashed: false,
  facets: [],
  schemas: [],
  lastModified: '2026-06-15T00:00:00.000Z',
  properties: {},
};

const emptySearchResult: SearchResult<NuxeoDocument> = {
  'entity-type': 'documents',
  isPaginable: true,
  resultsCount: 0,
  totalSize: 0,
  pageSize: 0,
  pageIndex: 0,
  pageCount: 0,
  entries: [],
};

const emptyDocuments: NuxeoDocuments = {
  'entity-type': 'documents',
  entries: [],
  currentPageIndex: 0,
  pageSize: 0,
  maxResults: 0,
  totalSize: 0,
};

const emptyAuditLog: AuditLogEntries = {
  'entity-type': 'logEntries',
  isPaginable: true,
  resultsCount: 0,
  pageSize: 0,
  maxPageSize: 0,
  resultsCountLimit: 0,
  currentPageSize: 0,
  currentPageIndex: 0,
  currentPageOffset: 0,
  numberOfPages: 0,
  isPreviousPageAvailable: false,
  isNextPageAvailable: false,
  isLastPageAvailable: true,
  isSortable: false,
  hasError: false,
  entries: [],
};

const userSuggestionFixture: UserSuggestion = {
  id: 'testuser',
  displayLabel: 'Test User',
  'entity-type': 'user',
  username: 'testuser',
};

describe('High coverage smoke specs', () => {
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  const shallowComponents = [
    CreateHandlingFromMail,
    DocumentPreviewComponent,
    DocumentInfoPanelComponent,
    EditFormComponent,
    PictureViewComponent,
    CollectionPermissionsComponent,
    CreateHandlingFormComponent,
    VideoViewComponent,
    CommentsComponent,
    CreateReducedCaseFormComponent,
    GeneralFormComponent,
    SelectCaseComponent,
    CreateFileFormComponent,
    MailMessageComponent,
    TableDateRangeFiltersComponent,
    FileViewComponent,
    ServiceNoteFormComponent,
    RequestCompletionEmailFormComponent,
    CustomMetadataEditComponent,
    DeliverPublicDocsFormComponent,
    PdfViewerComponent,
    CaseReferenceComponent,
    SendEmailFormComponent,
    DownloadAllFilesComponent,
    CreatePictureFormComponent,
    ReferencesDetailsComponent,
    CreateAudioFormComponent,
    CreateVideoFormComponent,
    EntityOverviewComponent,
    WorkflowComponent,
    BasicMetaDataTableComponent,
    ExpeditHandlingComponent,
    ConsultColleagueFormComponent,
    CreateHandlingComponent,
    CreateChecklistComponent,
    CreateKlassificComponent,
    ContactTableComponent,
    CreateArkivFormComponent,
    SelectHandlingsComponent,
    CreateCollectionFormComponent,
    HandlingOverviewComponent,
    CreateExportFormComponent,
  ];

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectorySuggestions',
      'getDocumentAudit',
      'getDocumentById',
      'getAdvancedDocumentContent',
      'getCollectionDocuments',
      'getDocumentVersions',
      'filterTemplatesByType',
      'getPathInfo',
      'getCaseOptions',
      'getLagrumOptions',
      'getAncestorsById',
      'getDocumentWithAcls',
      'DMSDocumentSuggestion',
      'getEmptyWithDefaults',
      'getMailTemplates',
      'getRenderedMailTemplate',
      'getHandlingTypes',
      'downloadFile',
      'getDownloadAllFiles',
      'requestPageProviderOptions',
      'getUserSuggestions',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));
    apiSpy.getDocumentAudit.and.returnValue(of(emptyAuditLog));
    apiSpy.getDocumentById.and.returnValue(of(documentFixture));
    apiSpy.getAdvancedDocumentContent.and.returnValue(of(emptySearchResult));
    apiSpy.getCollectionDocuments.and.returnValue(of(emptySearchResult));
    apiSpy.getDocumentVersions.and.returnValue(of(emptyDocuments));
    apiSpy.filterTemplatesByType.and.returnValue(
      of({
        ...emptySearchResult,
        entries: [] as NuxeoDocument<TemplateSourceProperties>[],
      })
    );
    apiSpy.getPathInfo.and.returnValue(of(documentFixture));
    apiSpy.getCaseOptions.and.returnValue(of(emptySearchResult));
    apiSpy.getLagrumOptions.and.returnValue(of([]));
    apiSpy.getAncestorsById.and.returnValue(of([]));
    apiSpy.getDocumentWithAcls.and.returnValue(of(documentFixture));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(emptySearchResult));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(documentFixture));
    apiSpy.getMailTemplates.and.returnValue(of(emptySearchResult));
    apiSpy.getRenderedMailTemplate.and.returnValue(of({ subject: '', content: '' }));
    apiSpy.getHandlingTypes.and.returnValue(of(emptySearchResult));
    apiSpy.downloadFile.and.returnValue('/blob/doc-1');
    apiSpy.getDownloadAllFiles.and.returnValue(of([]));
    apiSpy.requestPageProviderOptions.and.returnValue(of(emptySearchResult));
    apiSpy.getUserSuggestions.and.returnValue(of([userSuggestionFixture]));

    const authSpy = jasmine.createSpyObj('AuthService', ['username', 'fullName', 'hasRole', 'roles', 'activeRole'], {
      user: () => ({ id: 'testuser', properties: { groups: [] } }),
      loaded: () => true,
    });
    authSpy.username.and.returnValue('testuser');
    authSpy.fullName.and.returnValue('Test User');
    authSpy.hasRole.and.returnValue(false);
    authSpy.roles.and.returnValue([]);
    authSpy.activeRole.and.returnValue(null);

    const directoryOptionsSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    directoryOptionsSpy.getNatureOptions.and.returnValue(of([]));
    directoryOptionsSpy.getSubjectOptions.and.returnValue(of([]));
    directoryOptionsSpy.getCoverageOptions.and.returnValue(of([]));

    const formUtilsSpy = jasmine.createSpyObj('FormUtilsService', ['isValid', 'touchAll']);
    formUtilsSpy.isValid.and.returnValue(true);

    const lagrumFieldSpy = jasmine.createSpyObj('LagrumFieldService', [
      'buildField',
      'syncOptions',
      'insertAfter',
      'removeField',
    ]);
    lagrumFieldSpy.buildField.and.returnValue({ type: 'dropdown-search', name: 'lagrum', label: 'Lagrumsbeskrivning' });
    lagrumFieldSpy.syncOptions.and.callFake((config: FieldConfig[]) => config);
    lagrumFieldSpy.insertAfter.and.callFake((config: FieldConfig[], _afterFieldName: string, field: FieldConfig) => [
      ...config,
      field,
    ]);
    lagrumFieldSpy.removeField.and.callFake((config: FieldConfig[]) => config);

    const documentVersionSpy = jasmine.createSpyObj('DocumentVersionService', ['getVersions', 'restoreVersion']);
    documentVersionSpy.getVersions.and.returnValue(of([]));
    documentVersionSpy.restoreVersion.and.returnValue(of(documentFixture));

    const commentsSpy = jasmine.createSpyObj('CommentsService', ['getComments', 'addComment', 'deleteComment']);
    commentsSpy.getComments.and.returnValue(of([]));
    commentsSpy.addComment.and.returnValue(of({}));
    commentsSpy.deleteComment.and.returnValue(of({}));

    const documentValueSpy = jasmine.createSpyObj('DocumentValueService', ['getValue', 'getTitle', 'getState']);
    documentValueSpy.getValue.and.returnValue('');
    documentValueSpy.getTitle.and.returnValue('Document 1');
    documentValueSpy.getState.and.returnValue('');

    const userServiceSpy = jasmine.createSpyObj('UserService', ['getUserDisplayName']);
    userServiceSpy.getUserDisplayName.and.returnValue(of('Test User'));

    const casesServiceSpy = jasmine.createSpyObj('CasesService', [
      'getStatusLabel',
      'getStatusColor',
      'getStatusVariation',
    ]);
    casesServiceSpy.getStatusLabel.and.returnValue('Öppet');
    casesServiceSpy.getStatusColor.and.returnValue('approved');
    casesServiceSpy.getStatusVariation.and.returnValue('primary');

    const customMetadataSpy = jasmine.createSpyObj('CustomMetadataService', ['saveMetadataValues']);
    customMetadataSpy.saveMetadataValues.and.returnValue(of(documentFixture));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: {}, queryParams: {} }, params: of({}), queryParams: of({}) },
        },
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: DirectoryOptionsService, useValue: directoryOptionsSpy },
        { provide: FormUtilsService, useValue: formUtilsSpy },
        { provide: LagrumFieldService, useValue: lagrumFieldSpy },
        { provide: DocumentVersionService, useValue: documentVersionSpy },
        { provide: CommentsService, useValue: commentsSpy },
        { provide: DocumentValueService, useValue: documentValueSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: CasesService, useValue: casesServiceSpy },
        { provide: CustomMetadataService, useValue: customMetadataSpy },
        { provide: GeneralStore, useClass: GeneralStore },
        {
          provide: FavoritesService,
          useValue: jasmine.createSpyObj('FavoritesService', {
            checkInFavorites: of(false),
            toggleFavorites: of(documentFixture),
          }),
        },
        {
          provide: LockService,
          useValue: jasmine.createSpyObj('LockService', ['initLockState', 'toggleAndUpdate']),
        },
        {
          provide: NotificationService,
          useValue: jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError', 'showWarning']),
        },
        { provide: ShareLinkService, useValue: jasmine.createSpyObj('ShareLinkService', ['copyShareLink']) },
      ],
    });

    shallowComponents.forEach(component => {
      TestBed.overrideComponent(component, {
        set: {
          template: '<div></div>',
          imports: [],
        },
      });
    });

    await TestBed.compileComponents();
  });

  function createShallow<T>(component: Type<T>, inputs: Record<string, unknown> = {}): ComponentFixture<T> {
    const fixture = TestBed.createComponent(component);
    Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
    fixture.detectChanges();
    return fixture;
  }

  it('creates high-volume standalone components shallowly', () => {
    const fixtures = [
      createShallow(CreateHandlingFromMail, { document: documentFixture, attachments: [], parentId: 'parent-1' }),
      createShallow(DocumentPreviewComponent, { document: documentFixture }),
      createShallow(DocumentInfoPanelComponent, { document: documentFixture }),
      createShallow(EditFormComponent, { doc: documentFixture, config: [] }),
      createShallow(PictureViewComponent, { document: documentFixture }),
      createShallow(CollectionPermissionsComponent, { documentId: 'doc-1' }),
      createShallow(CreateHandlingFormComponent, { parentUid: 'parent-1', path: '/parent', itemType: 'Handling' }),
      createShallow(VideoViewComponent, { document: documentFixture }),
      createShallow(CommentsComponent, { documentId: 'doc-1' }),
      createShallow(CreateReducedCaseFormComponent, { parentUid: 'parent-1', path: '/parent' }),
      createShallow(GeneralFormComponent, { config: [] }),
      createShallow(SelectCaseComponent, { documentPath: '/parent' }),
      createShallow(CreateFileFormComponent, { path: '/parent', itemType: 'File' }),
      createShallow(MailMessageComponent, { document: documentFixture }),
      createShallow(TableDateRangeFiltersComponent),
      createShallow(FileViewComponent),
      createShallow(ServiceNoteFormComponent, { casePath: '/case-1' }),
      createShallow(RequestCompletionEmailFormComponent, { caseId: 'case-1', document: documentFixture }),
      createShallow(CustomMetadataEditComponent, {
        doc: documentFixture,
        valuesSignal: signal([]),
        definitionsSignal: signal([]),
        definitionDocIdSignal: signal(null),
      }),
      createShallow(DeliverPublicDocsFormComponent, { caseId: 'case-1' }),
      createShallow(PdfViewerComponent, { doc: documentFixture, parentDoc: documentFixture, blobUrl: '/blob/doc-1' }),
      createShallow(CaseReferenceComponent, {
        tableFields: signal([]),
        refType: 'Handling',
        parentRef: 'parent-1',
        fieldName: 'references',
      }),
      createShallow(SendEmailFormComponent, { caseId: 'case-1' }),
      createShallow(DownloadAllFilesComponent, { caseUid: 'case-1' }),
      createShallow(CreatePictureFormComponent, { path: '/parent', itemType: 'Picture' }),
      createShallow(ReferencesDetailsComponent, {
        parentRef: 'parent-1',
        references: [],
        refType: 'Handling',
        columnsConfig: [],
      }),
      createShallow(CreateAudioFormComponent, { path: '/parent', itemType: 'Audio' }),
      createShallow(CreateVideoFormComponent, { path: '/parent', itemType: 'Video' }),
      createShallow(EntityOverviewComponent, { document: documentFixture, folderTitle: 'Folder' }),
      createShallow(WorkflowComponent, { tasks: [] }),
      createShallow(BasicMetaDataTableComponent, { tableFields: signal([]) }),
      createShallow(ExpeditHandlingComponent, { caseId: 'case-1', document: documentFixture }),
      createShallow(ConsultColleagueFormComponent, { documentId: 'doc-1' }),
      createShallow(CreateHandlingComponent, { parentUid: 'parent-1', path: '/parent' }),
      createShallow(CreateChecklistComponent, { path: '/parent' }),
      createShallow(CreateKlassificComponent, { parentUid: 'parent-1', path: '/parent' }),
      createShallow(ContactTableComponent, { tableFields: signal([]), type: 'internal', fieldName: 'contacts' }),
      createShallow(CreateArkivFormComponent, { path: '/parent' }),
      createShallow(SelectHandlingsComponent, { caseId: 'case-1', formChange: () => undefined }),
      createShallow(CreateCollectionFormComponent, { path: '/parent' }),
      createShallow(HandlingOverviewComponent, { doc: documentFixture }),
      createShallow(CreateExportFormComponent, { path: '/parent' }),
    ];

    fixtures.forEach(fixture => expect(fixture.componentInstance).toBeTruthy());
  });
});
