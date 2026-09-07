import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NuxeoApiService } from './nuxeo-api.service';
import { NuxeoGroup, NxUser } from './nuxeo-api.types';

describe('NuxeoApiService', () => {
  let service: NuxeoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NuxeoApiService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });

    service = TestBed.inject(NuxeoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getMessagesJSON', () => {
    it('GETs the messages JSON file', done => {
      service.getMessagesJSON().subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/ui/i18n/messages-sv-SE.json');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('query', () => {
    it('POSTs to nxql_search/execute', done => {
      service.query('SELECT * FROM Document', { pageSize: 10, currentPageIndex: 0 }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/search/pp/nxql_search/execute');
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });
  });

  describe('executeNuxeoOperation', () => {
    it('POSTs to /automation/:operationId', done => {
      service.executeNuxeoOperation('MyOp', { input: 'doc', params: {}, context: {} }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/MyOp');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('getPathInfo', () => {
    it('GETs document by path', done => {
      service.getPathInfo('/default-domain/workspaces').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path'));
      expect(req.request.method).toBe('GET');
      req.flush({ uid: 'ws-1' });
    });

    it('prepends / to path if missing', done => {
      service.getPathInfo('default-domain').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path/default-domain'));
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('editDocument', () => {
    it('PUTs to /id/:uid', done => {
      service.editDocument('doc-1', { 'dc:title': 'New Title' }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1');
      expect(req.request.method).toBe('PUT');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('getDownloadAllFiles', () => {
    it('POSTs to DMS.ListAllFiles', done => {
      service.getDownloadAllFiles('arende-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.ListAllFiles');
      expect(req.request.method).toBe('POST');
      req.flush([]);
    });
  });

  describe('downloadAllFiles', () => {
    it('POSTs to DMS.Arende.DownloadFiles', done => {
      service.downloadAllFiles('arende-1', ['file-1']).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Arende.DownloadFiles');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.params.ids).toEqual(['file-1']);
      req.flush(new Blob(), { headers: { 'Content-Type': 'application/zip' } });
    });
  });

  describe('startZipExport', () => {
    it('POSTs to DMS.Export.StartaZipExport', done => {
      service.startZipExport('myndighet-1', 'arende-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/site/automation/DMS.Export.StartaZipExport');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('queryAuditEntries', () => {
    it('POSTs to Audit.QueryWithPageProvider', done => {
      service.queryAuditEntries({ currentPageIndex: 0, pageSize: 25 }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Audit.QueryWithPageProvider');
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });

    it('includes eventIds when provided', done => {
      service
        .queryAuditEntries({ currentPageIndex: 0, pageSize: 25, eventIds: 'documentCreated' })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Audit.QueryWithPageProvider');
      expect(req.request.body.params.namedQueryParams.eventIds).toBe('documentCreated');
      req.flush({ entries: [] });
    });

    it('includes eventCategory when provided', done => {
      service
        .queryAuditEntries({ currentPageIndex: 0, pageSize: 25, eventCategory: 'NuxeoTrigger' })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Audit.QueryWithPageProvider');
      expect(req.request.body.params.namedQueryParams.eventCategory).toBe('NuxeoTrigger');
      req.flush({ entries: [] });
    });
  });

  describe('requestPageProviderOptions', () => {
    it('POSTs to Repository.PageProvider', done => {
      service.requestPageProviderOptions('default').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.PageProvider');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('launchImporter', () => {
    it('POSTs to DMS.Importer.LaunchImporter', done => {
      service.launchImporter().subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Importer.LaunchImporter');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('includes importFolder in params when provided', done => {
      service.launchImporter('/import/folder').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Importer.LaunchImporter');
      expect(req.request.body.params.importFolder).toBe('/import/folder');
      req.flush({});
    });
  });

  describe('getUserGroupSuggestions', () => {
    it('POSTs to UserGroup.Suggestion', done => {
      service.getUserGroupSuggestions('alice').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/UserGroup.Suggestion');
      expect(req.request.method).toBe('POST');
      req.flush([]);
    });
  });

  describe('searchGroups', () => {
    it('GETs /group/search', done => {
      service.searchGroups('admin').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/group/search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('getGroup', () => {
    it('GETs group by id', done => {
      service.getGroup('administrators').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/group/administrators');
      expect(req.request.method).toBe('GET');
      req.flush({ groupname: 'administrators' });
    });
  });

  describe('getGroupUsers', () => {
    it('GETs group users', done => {
      service.getGroupUsers('administrators').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/group/administrators/@users'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('saveSearch', () => {
    it('POSTs to /search/saved', done => {
      service
        .saveSearch({ query: 'SELECT *', pageProviderName: 'test', title: 'My Search' } as never)
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/search/saved');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('getSavedSearches', () => {
    it('GETs /search/saved', done => {
      service.getSavedSearches().subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/search/saved');
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('deleteSavedSearch', () => {
    it('DELETEs /search/saved/:id', done => {
      service.deleteSavedSearch('search-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/search/saved/search-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('lockDocument', () => {
    it('POSTs to Document.Lock', done => {
      service.lockDocument('doc-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.Lock');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('unlockDocument', () => {
    it('POSTs to Document.Unlock', done => {
      service.unlockDocument('doc-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.Unlock');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('getDocumentAcls', () => {
    it('GETs /@acl for document', done => {
      service.getDocumentAcls('doc-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1/@acl');
      expect(req.request.method).toBe('GET');
      req.flush({ acl: [] });
    });
  });

  describe('removeDocumentPermission', () => {
    it('DELETEs permission', done => {
      service.removeDocumentPermission('doc-1', 'local', 'ace-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/@acl/'));
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('getStatistics', () => {
    it('POSTs to DMS.GetStatistics', done => {
      service.getStatistics().subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.GetStatistics');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('getGeneralSearchResults', () => {
    it('POSTs to Search.SuggestersLauncher', done => {
      service.getGeneralSearchResults('test').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Search.SuggestersLauncher');
      expect(req.request.method).toBe('POST');
      req.flush([]);
    });
  });

  describe('getDeletedFiles', () => {
    it('GETs default_trash_search', done => {
      service.getDeletedFiles(0, 25).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('default_trash_search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('restoreSelectedFiles', () => {
    it('POSTs to Document.Untrash with single id', done => {
      service.restoreSelectedFiles('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.Untrash'));
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });

    it('joins array ids with comma', done => {
      service.restoreSelectedFiles(['doc-1', 'doc-2']).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.Untrash'));
      expect(req.request.body.input).toContain('doc-1');
      req.flush({ entries: [] });
    });
  });

  describe('deleteSelectedFiles', () => {
    it('POSTs to Document.Delete', done => {
      service.deleteSelectedFiles(['doc-1']).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.Delete'));
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });
  });

  describe('getLatestCreatedUsersOrGroups', () => {
    it('GETs user/group provider', done => {
      service.getLatestCreatedUsersOrGroups(10, 0).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('LATEST_CREATED_USERS_OR_GROUPS_PROVIDER'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('getEntriesForParentPath', () => {
    it('GETs nxql search with parent uid', done => {
      service.getEntriesForParentPath('uid-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('nxql_search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('getMailMessages', () => {
    it('GETs mail messages for uid', done => {
      service.getMailMessages('folder-uid').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('mailmessage_search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('sendCaseEmail', () => {
    it('POSTs to DMS.Mail.SendMailFromArende', done => {
      service.sendCaseEmail('case-1', { recipients: ['test@test.com'] }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Mail.SendMailFromArende');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('editWorkflow', () => {
    it('PUTs to task endpoint', done => {
      service.editWorkflow('task-1', 'approve', {}).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/task/task-1/approve');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });
  });

  describe('getDocumentById', () => {
    it('GETs document by id', done => {
      service.getDocumentById('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-1'));
      expect(req.request.method).toBe('GET');
      req.flush({ uid: 'doc-1' });
    });

    it('includes firstAccessibleAncestor enricher', done => {
      service.getDocumentById('doc-1', false, { enrichers: ['firstAccessibleAncestor'] }).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-1'));
      expect(req.request.headers.get('enrichers-document')).toContain('firstAccessibleAncestor');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('deleteDocument', () => {
    it('DELETEs a document', done => {
      service.deleteDocument('doc-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('trashDocument', () => {
    it('POSTs to Document.Trash', done => {
      service.trashDocument('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.Trash'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('addToFavorites', () => {
    it('POSTs to Document.AddToFavorites', done => {
      service.addToFavorites('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.AddToFavorites'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('removeFromFavorites', () => {
    it('POSTs to Document.RemoveFromFavorites', done => {
      service.removeFromFavorites('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.RemoveFromFavorites'));
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('fetchFavoritesUid', () => {
    it('POSTs to Favorite.Fetch', done => {
      service.fetchFavoritesUid().subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Favorite.Fetch');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'fav-1' });
    });
  });

  describe('getCollections', () => {
    it('GETs user_collections', done => {
      service.getCollections().subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('user_collections'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('createCollection', () => {
    it('POSTs to Collection.Create via executeNuxeoOperation', done => {
      service.createCollection('My Collection').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Collection.Create');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'col-1' });
    });
  });

  describe('addDocumentToCollection', () => {
    it('POSTs to Document.AddToCollection', done => {
      service.addDocumentToCollection('col-1', ['doc-1', 'doc-2']).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.AddToCollection');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'col-1' });
    });
  });

  describe('removeDocumentFromCollection', () => {
    it('POSTs to Collection.RemoveFromCollection', done => {
      service.removeDocumentFromCollection('col-1', ['doc-1']).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Collection.RemoveFromCollection');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'col-1' });
    });
  });

  describe('deleteWorkflow', () => {
    it('DELETEs a workflow', done => {
      service.deleteWorkflow('wf-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/workflow/wf-1');
      expect(req.request.method).toBe('DELETE');
      req.flush([]);
    });
  });

  describe('createWorkflow', () => {
    it('POSTs to /id/:id/@workflow', done => {
      service.createWorkflow('doc-1', { documentIds: ['doc-1'] }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1/@workflow');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('getLagrumOptions', () => {
    it('GETs from /nuxeo/api/v1/query with Lagrum type filter', done => {
      service.getLagrumOptions().subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/query'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('getHandlingWithFile', () => {
    it('POSTs to Document.GetChildren', done => {
      service.getHandlingWithFile('handling-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.GetChildren');
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });
  });

  describe('getSeveralDocsByUids', () => {
    it('returns EMPTY for empty uids array', done => {
      service.getSeveralDocsByUids([]).subscribe({ complete: () => done() });
    });

    it('POSTs to Repository.Query', done => {
      service.getSeveralDocsByUids(['uid-1', 'uid-2']).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });
  });

  describe('getLifecycleTransitions', () => {
    it('POSTs to DMS.Lifecycle.GetLifecycleTransitions', done => {
      service.getLifecycleTransitions('doc-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Lifecycle.GetLifecycleTransitions');
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });
  });

  describe('followLifecycleTransition', () => {
    it('POSTs to Document.FollowLifecycleTransition', done => {
      service.followLifecycleTransition('doc-1', 'approve').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.FollowLifecycleTransition');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('getDocumentVersions', () => {
    it('POSTs to Document.GetVersions', done => {
      service.getDocumentVersions('doc-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.GetVersions');
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });
  });

  describe('restoreDocumentVersion', () => {
    it('POSTs to Document.RestoreVersion', done => {
      service.restoreDocumentVersion('ver-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.RestoreVersion'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('getUserSuggestions', () => {
    it('POSTs to UserGroup.Suggestion', done => {
      service.getUserSuggestions('alice').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/UserGroup.Suggestion');
      expect(req.request.method).toBe('POST');
      req.flush([]);
    });
  });

  describe('getDirectoryEntries', () => {
    it('GETs directory entries', done => {
      service.getDirectoryEntries('Sekretess').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/directory/Sekretess'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('getDirectories', () => {
    it('GETs directories list', done => {
      service.getDirectories().subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/directory'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('searchUsers', () => {
    it('GETs user search results', done => {
      service.searchUsers('alice').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/user/search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('getUser', () => {
    it('GETs user by id', done => {
      service.getUser('alice').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/user/alice');
      expect(req.request.method).toBe('GET');
      req.flush({ username: 'alice' });
    });
  });

  describe('deleteUser', () => {
    it('DELETEs user', done => {
      service.deleteUser('alice').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/user/alice');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('updateUser', () => {
    it('PUTs user update', done => {
      const user: NxUser = { 'entity-type': 'user', id: 'alice', properties: { username: 'alice' } };
      service.updateUser('alice', user).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/user/alice');
      expect(req.request.method).toBe('PUT');
      req.flush({ username: 'alice' });
    });
  });

  describe('deleteGroup', () => {
    it('DELETEs group', done => {
      service.deleteGroup('admins').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/group/admins');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('updateGroup', () => {
    it('PUTs group update', done => {
      const group: NuxeoGroup = { 'entity-type': 'group', groupname: 'admins', memberUsers: [] };
      service.updateGroup('admins', group).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/group/admins');
      expect(req.request.method).toBe('PUT');
      req.flush({ groupname: 'admins' });
    });
  });

  describe('setResponsibleManager', () => {
    it('PUTs to set responsible manager', done => {
      service.setResponsibleManager('doc-1', 'alice').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-1'));
      expect(req.request.method).toBe('PUT');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('updateResponsibleManager', () => {
    it('PUTs to /id/:id to update responsible manager', done => {
      service.updateResponsibleManager('doc-1', 'alice').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1');
      expect(req.request.method).toBe('PUT');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('downloadFile', () => {
    it('returns a download URL string', () => {
      const url = service.downloadFile('doc-1');
      expect(typeof url).toBe('string');
      expect(url).toContain('doc-1');
    });
  });

  describe('downloadBulk', () => {
    it('POSTs to Blob.BulkDownload', done => {
      service.downloadBulk(['doc-1', 'doc-2']).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Blob.BulkDownload');
      expect(req.request.method).toBe('POST');
      req.flush(new Blob());
    });
  });

  describe('getAncestorsById', () => {
    it('returns document array when document has no parent', done => {
      service.getAncestorsById('doc-1').subscribe(result => {
        expect(Array.isArray(result)).toBeTrue();
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-1'));
      req.flush({ uid: 'doc-1', parentRef: null, contextParameters: { firstAccessibleAncestor: { uid: 'doc-1' } } });
    });
  });

  describe('advanceCaseLifecycle', () => {
    it('returns of(void) when target state is not reachable from current', done => {
      service.advanceCaseLifecycle('case-1', 'beslutat', 'underHandlaggning').subscribe(() => done());
    });

    it('POSTs lifecycle transitions when advancing forward', done => {
      service.advanceCaseLifecycle('case-1', 'registrerat', 'underFordelning').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.FollowLifecycleTransition');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('closeCase', () => {
    it('POSTs Document.FollowLifecycleTransition with to_stangt', done => {
      service.closeCase('case-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.FollowLifecycleTransition');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.params.value).toBe('to_stangt');
      req.flush({});
    });
  });

  describe('markCaseCancelled', () => {
    it('POSTs Document.FollowLifecycleTransition with to_makulerad', done => {
      service.markCaseCancelled('case-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.FollowLifecycleTransition');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.params.value).toBe('to_makulerad');
      req.flush({});
    });
  });

  describe('createHandling', () => {
    it('POSTs to DMS.Importer.CreateHandling', done => {
      service.createHandling({ parentId: 'case-1', type: 'Handling' }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Importer.CreateHandling');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'handling-1' });
    });
  });

  describe('getDirectorySuggestions', () => {
    it('POSTs to Directory.SuggestEntries', done => {
      service.getDirectorySuggestions('Sekretess').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Directory.SuggestEntries'));
      expect(req.request.method).toBe('POST');
      req.flush([]);
    });

    it('passes opts dbl10n, localize, lang, searchTerm when provided', done => {
      service
        .getDirectorySuggestions('TestDir', { dbl10n: true, localize: false, lang: 'sv', searchTerm: 'abc' })
        .subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Directory.SuggestEntries'));
      expect(req.request.body.params.dbl10n).toBe(true);
      expect(req.request.body.params.localize).toBe(false);
      expect(req.request.body.params.lang).toBe('sv');
      expect(req.request.body.params.searchTerm).toBe('abc');
      req.flush([]);
    });
  });

  describe('queryPageProvider', () => {
    it('POSTs form-encoded body to nxql_search/execute', done => {
      service
        .queryPageProvider('SELECT * FROM Document', { pageSize: 10, currentPageIndex: 0 })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/search/pp/nxql_search/execute');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Content-Type')).toContain('application/x-www-form-urlencoded');
      req.flush({ entries: [] });
    });
  });

  describe('extractImportData', () => {
    it('POSTs to DMS.Importer.ExtractData', done => {
      service.extractImportData('doc-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Importer.ExtractData');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.input).toBe('doc-1');
      req.flush({});
    });
  });

  describe('getPathInfo - enrichers branches', () => {
    it('accepts a single string enricher', done => {
      service.getPathInfo('/some/path', { enrichers: 'acls' }).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path'));
      expect(req.request.headers.get('enrichers-document')).toContain('acls');
      req.flush({ uid: 'doc-1' });
    });

    it('accepts an array of enrichers', done => {
      service.getPathInfo('/some/path', { enrichers: ['acls', 'breadcrumb'] }).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path'));
      expect(req.request.headers.get('enrichers-document')).toContain('acls');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('saveEditDocProperties', () => {
    it('POSTs to SaveUtkastTemplatePropertiesAndRenderPDF', done => {
      service.saveEditDocProperties('file-1', 'template-1', []).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('SaveUtkastTemplatePropertiesAndRenderPDF'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'file-1' });
    });
  });

  describe('getUtkastDocumentVersions', () => {
    it('GETs from /search/execute with version query', done => {
      service.getUtkastDocumentVersions('file-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/search/execute'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('restoreVersion', () => {
    it('POSTs to Document.RestoreVersion', done => {
      service.restoreVersion().subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.RestoreVersion'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('getAdvancedDocumentContent', () => {
    it('GETs advanced_document_content with defaults', done => {
      service.getAdvancedDocumentContent('parent-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('advanced_document_content'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });

    it('adds sortBy param when provided', done => {
      service.getAdvancedDocumentContent('parent-1', 0, 40, false, 'dc:title').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('advanced_document_content'));
      expect(req.request.params.get('sortBy')).toBe('dc:title');
      req.flush({ entries: [] });
    });

    it('adds sortOrder param when sortBy and sortOrder are provided', done => {
      service.getAdvancedDocumentContent('parent-1', 0, 40, false, 'dc:title', 'desc').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('advanced_document_content'));
      expect(req.request.params.get('sortOrder')).toBe('DESC');
      req.flush({ entries: [] });
    });

    it('sets fetch-document header when isExtended is true', done => {
      service.getAdvancedDocumentContent('parent-1', 0, 40, true).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('advanced_document_content'));
      expect(req.request.headers.get('fetch-document')).toBe('properties');
      req.flush({ entries: [] });
    });
  });

  describe('getMailMessages', () => {
    it('adds sortBy param when provided', done => {
      service.getMailMessages('folder-uid', 0, 40, 'dc:modified').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('mailmessage_search'));
      expect(req.request.params.get('sortBy')).toBe('dc:modified');
      req.flush({ entries: [] });
    });

    it('adds sortOrder param when sortBy and sortOrder are provided', done => {
      service.getMailMessages('folder-uid', 0, 40, 'dc:modified', 'asc').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('mailmessage_search'));
      expect(req.request.params.get('sortOrder')).toBe('ASC');
      req.flush({ entries: [] });
    });
  });

  describe('getAdvancedSearchResults', () => {
    it('GETs from dms_search', done => {
      service.getAdvancedSearchResults({ dc_title: 'test' }).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('dms_search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('createUser', () => {
    it('POSTs to /user', done => {
      const payload = {
        'entity-type': 'user' as const,
        id: 'alice',
        properties: { username: 'alice', email: 'alice@example.com' },
      };
      service.createUser(payload).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/user');
      expect(req.request.method).toBe('POST');
      req.flush({ id: 'alice' });
    });
  });

  describe('createGroup', () => {
    it('POSTs to /group', done => {
      service.createGroup({ 'entity-type': 'group', groupname: 'testgroup' }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/group');
      expect(req.request.method).toBe('POST');
      req.flush({ groupname: 'testgroup' });
    });
  });

  describe('addUserToGroup', () => {
    it('POSTs to user/:userId/group/:groupId', done => {
      service.addUserToGroup('alice', 'admins').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/user/alice/group/admins');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('removeUserFromGroup', () => {
    it('DELETEs user from group', done => {
      service.removeUserFromGroup('alice', 'admins').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/user/alice/group/admins');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('createDirectoryEntry', () => {
    it('POSTs to /directory/:name', done => {
      service
        .createDirectoryEntry('Sekretess', {
          'entity-type': 'directoryEntry',
          directoryName: 'Sekretess',
          id: 'new-1',
          properties: { id: 'new-1', label: 'New Entry' },
        } as never)
        .subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/directory/Sekretess'));
      expect(req.request.method).toBe('POST');
      req.flush({ id: 'new-1' });
    });
  });

  describe('updateDirectoryEntry', () => {
    it('PUTs to /directory/:name/:id', done => {
      service
        .updateDirectoryEntry('Sekretess', 'entry-1', {
          'entity-type': 'directoryEntry',
          directoryName: 'Sekretess',
          id: 'entry-1',
          properties: { id: 'entry-1', label: 'Updated' },
        } as never)
        .subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/directory/Sekretess/entry-1'));
      expect(req.request.method).toBe('PUT');
      req.flush({ id: 'entry-1' });
    });
  });

  describe('deleteDirectoryEntry', () => {
    it('DELETEs from /directory/:name/:id', done => {
      service.deleteDirectoryEntry('Sekretess', 'entry-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/directory/Sekretess/entry-1'));
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('setDeadline', () => {
    it('POSTs to /id/:docId/@workflow', done => {
      service.setDeadline('doc-1', 'alice', '2024-01-01').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1/@workflow');
      expect(req.request.method).toBe('POST');
      req.flush([]);
    });

    it('includes reminder and description when provided', done => {
      service.setDeadline('doc-1', 'alice', '2024-01-01', '2023-12-25', 'My deadline').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1/@workflow');
      expect(req.request.body.variables.paminnelse).toBe('2023-12-25');
      expect(req.request.body.variables.beskrivning).toBe('My deadline');
      req.flush([]);
    });
  });

  describe('DMSDocumentSuggestion', () => {
    it('POSTs to Document.DMSDocumentSuggestion without selectedKlass', done => {
      service.DMSDocumentSuggestion('parent-1', 'Arende', 'Handling').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.DMSDocumentSuggestion'));
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });

    it('includes selectedKlass when provided', done => {
      service
        .DMSDocumentSuggestion('parent-1', 'Arende', 'Handling', 'search term', {
          selectedKlass: 'klass-1',
          pageSize: 50,
        })
        .subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.DMSDocumentSuggestion'));
      expect(req.request.body.params.selectedKlass).toBe('klass-1');
      expect(req.request.body.params.pageSize).toBe(50);
      req.flush({ entries: [] });
    });
  });

  describe('getLagrumOptions', () => {
    it('returns empty array when entries is empty', done => {
      service.getLagrumOptions().subscribe(result => {
        expect(result).toEqual([]);
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/query'));
      req.flush({ entries: [] });
    });

    it('returns empty array on error', done => {
      service.getLagrumOptions().subscribe(result => {
        expect(result).toEqual([]);
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/query'));
      req.flush('error', { status: 500, statusText: 'Server Error' });
    });

    it('maps entries to options with label and id', done => {
      service.getLagrumOptions().subscribe(result => {
        expect(result).toEqual([{ label: 'Lag A', id: 'uid-1' }]);
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/query'));
      req.flush({ entries: [{ title: 'Lag A', uid: 'uid-1' }] });
    });
  });

  describe('getHandlingTypes', () => {
    it('POSTs to Repository.Query for Handlingstyp', done => {
      service.getHandlingTypes().subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.params.query).toContain('Handlingstyp');
      req.flush({ entries: [] });
    });
  });

  describe('getTagSuggestions', () => {
    it('POSTs to Tag.Suggestion', done => {
      service.getTagSuggestions('my-tag').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Tag.Suggestion');
      expect(req.request.method).toBe('POST');
      req.flush([]);
    });
  });

  describe('tagDocument', () => {
    it('POSTs to Services.TagDocument', done => {
      service.tagDocument('doc-1', ['tag1', 'tag2']).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Services.TagDocument');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('untagDocument', () => {
    it('POSTs to Services.UntagDocument', done => {
      service.untagDocument('doc-1', 'tag1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Services.UntagDocument');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('getMailTemplates', () => {
    it('POSTs to Repository.Query for EPostmall', done => {
      service.getMailTemplates().subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.params.query).toContain('EPostmall');
      req.flush({ entries: [] });
    });
  });

  describe('getCaseOptions', () => {
    it('POSTs with unmodified query when no searchTerm', done => {
      service.getCaseOptions('SELECT * FROM Arende').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });

    it('appends AND clause when query has WHERE and no ORDER BY', done => {
      service.getCaseOptions('SELECT * FROM Arende WHERE ecm:isTrashed = 0', 'test').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.body.params.query).toContain("dc:title ILIKE '%test%'");
      req.flush({ entries: [] });
    });

    it('adds WHERE clause when query has no WHERE and no ORDER BY', done => {
      service.getCaseOptions('SELECT * FROM Arende', 'test').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.body.params.query).toContain('ecm:isTrashed = 0');
      req.flush({ entries: [] });
    });

    it('inserts clause before ORDER BY when query has WHERE and ORDER BY', done => {
      service
        .getCaseOptions('SELECT * FROM Arende WHERE ecm:isTrashed = 0 ORDER BY dc:title ASC', 'test')
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      const query: string = req.request.body.params.query;
      expect(query).toContain("dc:title ILIKE '%test%'");
      expect(query.toUpperCase()).toContain('ORDER BY');
      req.flush({ entries: [] });
    });

    it('adds WHERE before ORDER BY when query has no WHERE but has ORDER BY', done => {
      service.getCaseOptions('SELECT * FROM Arende ORDER BY dc:title ASC', 'test').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      const query: string = req.request.body.params.query;
      expect(query).toContain('ecm:isTrashed = 0');
      req.flush({ entries: [] });
    });

    it('escapes single quotes in searchTerm', done => {
      service.getCaseOptions('SELECT * FROM Arende', "o'brien").subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.body.params.query).toContain("o''brien");
      req.flush({ entries: [] });
    });
  });

  describe('createHandlingFromImportFile', () => {
    it('POSTs to DMS.Importer.CreateHandling with importFileId as input', done => {
      service.createHandlingFromImportFile('import-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Importer.CreateHandling');
      expect(req.request.body.input).toBe('import-1');
      req.flush({ uid: 'handling-1' });
    });
  });

  describe('getEmptyWithDefaults', () => {
    it('GETs @emptyWithDefault when path starts with /', done => {
      service.getEmptyWithDefaults('/some/path', 'Arende').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('@emptyWithDefault'));
      expect(req.request.method).toBe('GET');
      req.flush({ uid: 'doc-1' });
    });

    it('prepends / to path when path does not start with /', done => {
      service.getEmptyWithDefaults('some/path', 'Arende').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('@emptyWithDefault'));
      expect(req.request.url).toContain('/some/path');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('initializeUpload', () => {
    it('POSTs to /upload/new/default', done => {
      service.initializeUpload().subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/upload/new/default');
      expect(req.request.method).toBe('POST');
      req.flush({ batchId: 'batch-1' });
    });
  });

  describe('uploadFile', () => {
    it('POSTs to /upload/:batchId/:fileIndex', done => {
      const mockFile = [{ name: 'test.pdf', type: 'application/pdf' }] as never;
      service.uploadFile('batch-1', mockFile, 0).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/upload/batch-1/0');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('attachFile', () => {
    it('POSTs to /id/:handlingId without batchId', done => {
      service.attachFile(null, 'myfile.pdf', 'handling-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/handling-1');
      expect(req.request.method).toBe('POST');
      const body = req.request.body;
      expect(body.properties['file:content']).toBeUndefined();
      req.flush({ uid: 'file-1' });
    });

    it('includes upload-batch when batchId is provided', done => {
      service.attachFile('batch-1', 'myfile.pdf', 'handling-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/handling-1');
      const body = req.request.body;
      expect(body.properties['file:content']['upload-batch']).toBe('batch-1');
      req.flush({ uid: 'file-1' });
    });

    it('includes templateId when provided', done => {
      service.attachFile('batch-1', 'myfile.pdf', 'handling-1', 'huvudfil', '0', 'template-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/handling-1');
      expect(req.request.body.properties['fil:mallenId']).toBe('template-1');
      req.flush({ uid: 'file-1' });
    });
  });

  describe('createDocument', () => {
    it('POSTs to /path/:path', done => {
      service.createDocument({ 'entity-type': 'document', type: 'Arende' }, '/default-domain').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path/default-domain'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });

    it('prepends / to path when missing', done => {
      service.createDocument({ 'entity-type': 'document', type: 'Arende' }, 'default-domain').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path/default-domain'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });

    it('requests full properties so custom schema fields are returned', done => {
      service.createDocument({ 'entity-type': 'document', type: 'Arende' }, '/default-domain').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path/default-domain'));
      expect(req.request.headers.get('properties')).toBe('*');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('runBulkAction', () => {
    it('POSTs to Bulk.RunAction/@async and extracts id from body', done => {
      service.runBulkAction({ actionId: 'myAction', query: 'SELECT * FROM Document' } as never).subscribe(id => {
        expect(id).toBe('async-123');
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('Bulk.RunAction'));
      req.flush({ id: 'async-123' }, { headers: {} });
    });

    it('falls back to taskId when id is missing', done => {
      service.runBulkAction({ actionId: 'myAction' } as never).subscribe(id => {
        expect(id).toBe('task-456');
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('Bulk.RunAction'));
      req.flush({ taskId: 'task-456' });
    });

    it('falls back to value.commandId when id and taskId are missing', done => {
      service.runBulkAction({ actionId: 'myAction' } as never).subscribe(id => {
        expect(id).toBe('cmd-789');
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('Bulk.RunAction'));
      req.flush({ value: { commandId: 'cmd-789' } });
    });

    it('extracts id from Location header when body has no id', done => {
      service.runBulkAction({ actionId: 'myAction' } as never).subscribe(id => {
        expect(id).toBeTruthy();
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('Bulk.RunAction'));
      req.flush({}, { headers: { location: 'http://server/@async/loc-id-999/status' } });
    });

    it('throws error when no async id can be extracted', done => {
      service.runBulkAction({ actionId: 'myAction' } as never).subscribe({
        error: err => {
          expect(err.message).toContain('Missing async bulk action id');
          done();
        },
      });
      const req = httpMock.expectOne(r => r.url.includes('Bulk.RunAction'));
      req.flush({});
    });
  });

  describe('getBulkActionStatus', () => {
    it('GETs bulk action status by commandId', done => {
      service.getBulkActionStatus('cmd-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Bulk.RunAction/@async/cmd-1/status'));
      expect(req.request.method).toBe('GET');
      req.flush({ state: 'COMPLETED' });
    });
  });

  describe('downloadBulkActionResult', () => {
    it('GETs bulk action result by commandId', done => {
      service.downloadBulkActionResult('cmd-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Bulk.RunAction/@async/cmd-1'));
      expect(req.request.method).toBe('GET');
      req.flush({ url: 'http://server/download' });
    });
  });

  describe('deleteAttachment', () => {
    it('POSTs to Blob.RemoveFromDocument with xpath', done => {
      service.deleteAttachment(0, 'parent-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Blob.RemoveFromDocument'));
      expect(req.request.body.params.xpath).toBe('files:files/0');
      req.flush({ uid: 'parent-1' });
    });
  });

  describe('deleteMainAttachment', () => {
    it('POSTs to Blob.RemoveFromDocument for main file', done => {
      service.deleteMainAttachment('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Blob.RemoveFromDocument'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('deleteSeveralDocument', () => {
    it('POSTs to Document.Trash with docs: input', done => {
      service.deleteSeveralDocument(['doc-1', 'doc-2']).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.Trash'));
      expect(req.request.body.input).toContain('docs:');
      req.flush([]);
    });
  });

  describe('updateAssignees', () => {
    it('POSTs to Document.UpdateArendeAssignees', done => {
      service.updateAssignees('case-1', 'org-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.UpdateArendeAssignees'));
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('includes userId and medhandlaggare when provided', done => {
      service.updateAssignees('case-1', 'org-1', 'alice', ['bob']).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.UpdateArendeAssignees'));
      expect(req.request.body.params.ansvarig_handlaggare).toBe('alice');
      expect(req.request.body.params.medhandlaggare).toEqual(['bob']);
      req.flush({});
    });
  });

  describe('getReadytoCloseCases', () => {
    it('GETs ready-to-close cases', done => {
      service.getReadytoCloseCases().subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/query'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('findNearestHandling', () => {
    it('returns the document itself when type is Handling', done => {
      service.findNearestHandling('/path/to/doc').subscribe(result => {
        expect(result?.type).toBe('Handling');
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path'));
      req.flush({ uid: 'doc-1', type: 'Handling', parentRef: 'parent-1' });
    });

    it('returns null when document has no parentRef', done => {
      service.findNearestHandling('/path/to/doc').subscribe(result => {
        expect(result).toBeNull();
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path'));
      req.flush({ uid: 'doc-1', type: 'Fil', parentRef: null });
    });

    it('resolves parent document when parent type is Handling', done => {
      service.findNearestHandling('/path/to/doc').subscribe(result => {
        expect(result?.type).toBe('Handling');
        done();
      });
      const pathReq = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/path'));
      pathReq.flush({ uid: 'doc-1', type: 'Fil', parentRef: 'parent-1', path: '/path/to/doc' });

      const parentReq = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/parent-1'));
      parentReq.flush({ uid: 'parent-1', type: 'Handling', path: '/path/to' });
    });
  });

  describe('searchCollections', () => {
    it('GETs user_collections with searchTerm', done => {
      service.searchCollections('my collection').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('user_collections'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });

    it('uses % as searchTerm when empty string is passed', done => {
      service.searchCollections('').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('user_collections'));
      expect(req.request.params.get('searchTerm')).toBe('%');
      req.flush({ entries: [] });
    });
  });

  describe('addToCollectionByName', () => {
    it('adds to existing collection when found', done => {
      service.addToCollectionByName('My Collection', ['doc-1']).subscribe(() => done());

      const searchReq = httpMock.expectOne(r => r.url.includes('user_collections'));
      searchReq.flush({ entries: [{ uid: 'col-1', title: 'My Collection' }] });

      const addReq = httpMock.expectOne('/nuxeo/api/v1/automation/Document.AddToCollection');
      expect(addReq.request.body.params.collection).toBe('col-1');
      addReq.flush({ uid: 'col-1' });
    });

    it('creates new collection and adds when not found', done => {
      service.addToCollectionByName('New Collection', ['doc-1'], 'A description').subscribe(() => done());

      const searchReq = httpMock.expectOne(r => r.url.includes('user_collections'));
      searchReq.flush({ entries: [] });

      const createReq = httpMock.expectOne('/nuxeo/api/v1/automation/Collection.Create');
      createReq.flush({ uid: 'new-col-1' });

      const addReq = httpMock.expectOne('/nuxeo/api/v1/automation/Document.AddToCollection');
      expect(addReq.request.body.params.collection).toBe('new-col-1');
      addReq.flush({ uid: 'new-col-1' });
    });
  });

  describe('getCollectionsForDocument', () => {
    it('GETs /@collections for document', done => {
      service.getCollectionsForDocument('doc-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1/@collections');
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });

  describe('uploadAttachmentDocuments', () => {
    it('returns of([]) for empty files array', done => {
      service.uploadAttachmentDocuments('parent-1', 'batch-1', []).subscribe(result => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('forkJoins upload requests for each file', done => {
      const mockFiles = [
        new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
      ];

      service.uploadAttachmentDocuments('parent-1', 'batch-1', mockFiles).subscribe(results => {
        expect(results.length).toBe(2);
        done();
      });

      const reqs = httpMock.match(r => r.url.includes('/nuxeo/api/v1/id/parent-1'));
      expect(reqs.length).toBe(2);
      reqs.forEach(r => r.flush({ uid: 'file-1' }));
    });
  });

  describe('automation', () => {
    it('delegates to executeNuxeoOperation', done => {
      service.automation('MyOp', { input: 'doc', params: {} }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/MyOp');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('createHandlingFromNote', () => {
    it('POSTs to DMS.Handling.CreateHandlingFromNote', done => {
      service
        .createHandlingFromNote({
          input: 'doc-1',
          params: { arende: 'case-1', handling: {}, anteckning: 'Note text' },
          context: {},
        })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Handling.CreateHandlingFromNote');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'handling-1' });
    });
  });

  describe('sendCaseEmail - payload branches', () => {
    it('uses template and subject when provided', done => {
      service
        .sendCaseEmail('case-1', {
          recipients: ['a@b.com'],
          template: 'tpl-1',
          subject: 'My subject',
          body: 'Body text',
          ccRecipients: ['cc@b.com'],
          bccRecipients: ['bcc@b.com'],
          replyTo: ['reply@b.com'],
          attachments: [{}],
          handling: { key: 'val' },
          attachHandling: true,
          attachedHandlingar: ['h-1'],
        })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Mail.SendMailFromArende');
      expect(req.request.body.params.template).toBe('tpl-1');
      expect(req.request.body.params.subject).toBe('My subject');
      req.flush({});
    });
  });

  describe('checkEmails', () => {
    it('POSTs to Mail.CheckInbox', done => {
      service.checkEmails('mail-folder-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Mail.CheckInbox');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'mail-folder-1' });
    });
  });

  describe('shareSearch', () => {
    it('POSTs to Document.AddPermission for search sharing', done => {
      service.shareSearch(['alice', 'bob'], 'search-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.AddPermission');
      expect(req.request.body.input).toBe('search-1');
      req.flush({});
    });
  });

  describe('shareDocumentWithExternalUser', () => {
    it('POSTs to Document.AddPermission with email', done => {
      service
        .shareDocumentWithExternalUser('doc-1', {
          email: 'ext@example.com',
          permission: 'Read',
          begin: null,
          end: null,
          notify: true,
          comment: 'Please review',
        })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.AddPermission');
      expect(req.request.body.params.email).toBe('ext@example.com');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('addDocumentPermission', () => {
    it('POSTs to Document.AddPermission with users list', done => {
      service
        .addDocumentPermission('doc-1', {
          users: ['alice'],
          permission: 'Write',
          begin: null,
          end: null,
          notify: false,
        })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.AddPermission');
      expect(req.request.body.params.users).toEqual(['alice']);
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('replaceDocumentPermission', () => {
    it('POSTs to Document.ReplacePermission', done => {
      service
        .replaceDocumentPermission('doc-1', {
          username: 'alice',
          permission: 'Read',
          begin: null,
          end: null,
          notify: false,
          id: 'ace-1',
        })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.ReplacePermission');
      expect(req.request.body.params.id).toBe('ace-1');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('removeDocumentPermissionAutomation', () => {
    it('POSTs to Document.RemovePermission', done => {
      service.removeDocumentPermissionAutomation('doc-1', { id: 'ace-1', acl: 'local' }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.RemovePermission');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('sendPermissionNotificationEmail', () => {
    it('POSTs to Document.SendNotificationEmailForPermission', done => {
      service.sendPermissionNotificationEmail('doc-1', { id: 'ace-1' }).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.SendNotificationEmailForPermission'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('getDocumentWithAcls', () => {
    it('GETs document with acl enricher', done => {
      service.getDocumentWithAcls('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-1'));
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('enrichers-document')).toContain('acls');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('blockPermissionInheritance', () => {
    it('POSTs to Document.BlockPermissionInheritance', done => {
      service.blockPermissionInheritance('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.BlockPermissionInheritance'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('unblockPermissionInheritance', () => {
    it('POSTs to Document.UnblockPermissionInheritance', done => {
      service.unblockPermissionInheritance('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.UnblockPermissionInheritance'));
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('filterTemplatesByType', () => {
    it('POSTs to javascript.FilterTemplatesByType', done => {
      service.filterTemplatesByType('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('javascript.FilterTemplatesByType'));
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });
  });

  describe('renderArendePdf', () => {
    it('POSTs to javascript.RenderPdf and returns blob', done => {
      service.renderArendePdf('arende-1', 'template-1', '{"key":"val"}').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('javascript.RenderPdf'));
      expect(req.request.method).toBe('POST');
      req.flush(new Blob(['pdf content']), { headers: { 'Content-Type': 'application/pdf' } });
    });
  });

  describe('generateFileFromTemplate', () => {
    it('POSTs to DMS.TR.GenerateFromTemplate', done => {
      service.generateFileFromTemplate('template-1', 'utkast-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/site/automation/DMS.TR.GenerateFromTemplate');
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });
  });

  describe('getCollectionDocuments', () => {
    it('GETs default_content_collection with defaults', done => {
      service.getCollectionDocuments('col-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('default_content_collection'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });

    it('adds sortBy and sortOrder when provided', done => {
      service.getCollectionDocuments('col-1', 0, 10, 'dc:title', 'asc').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('default_content_collection'));
      expect(req.request.params.get('sortBy')).toBe('dc:title');
      expect(req.request.params.get('sortOrder')).toBe('ASC');
      req.flush({ entries: [] });
    });
  });

  describe('setResponsibleManager', () => {
    it('normalizes previousAssignee whitespace to null', done => {
      service.setResponsibleManager('doc-1', 'alice', '  ').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-1'));
      expect(req.request.body.properties['handling:granskare']).toBeNull();
      req.flush({ uid: 'doc-1' });
    });

    it('preserves non-empty previousAssignee', done => {
      service.setResponsibleManager('doc-1', 'alice', 'bob').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-1'));
      expect(req.request.body.properties['handling:granskare']).toBe('bob');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('updateRequester', () => {
    it('PUTs granskare to /id/:id', done => {
      service.updateRequester('doc-1', 'alice').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1');
      expect(req.request.method).toBe('PUT');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('updateFile', () => {
    it('PUTs to /id/:fileId with file properties', done => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      service.updateFile('file-1', 'batch-1', mockFile).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/id/file-1');
      expect(req.request.method).toBe('PUT');
      req.flush({ uid: 'file-1' });
    });
  });

  describe('getDocumentById - extra branches', () => {
    it('sets fetch-document to properties,lock when shouldHaveProperties=true', done => {
      service.getDocumentById('doc-1', true).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-1'));
      expect(req.request.headers.get('fetch-document')).toBe('properties,lock');
      req.flush({ uid: 'doc-1' });
    });

    it('accepts string enricher', done => {
      service.getDocumentById('doc-1', false, { enrichers: 'breadcrumb' }).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-1'));
      expect(req.request.headers.get('enrichers-document')).toContain('breadcrumb');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('getDocumentAudit', () => {
    it('GETs /@audit for document', done => {
      service.getDocumentAudit('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/@audit'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });

    it('passes custom currentPageIndex and pageSize', done => {
      service.getDocumentAudit('doc-1', { currentPageIndex: 2, pageSize: 20 }).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('/@audit'));
      expect(req.request.params.get('currentPageIndex')).toBe('2');
      expect(req.request.params.get('pageSize')).toBe('20');
      req.flush({ entries: [] });
    });
  });

  describe('getSourceDocumentFromProxy', () => {
    it('POSTs to Proxy.GetSourceDocument', done => {
      service.getSourceDocumentFromProxy('proxy-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Proxy.GetSourceDocument');
      expect(req.request.method).toBe('POST');
      req.flush({ uid: 'doc-1' });
    });
  });

  describe('getHandlingWithFileProperties', () => {
    it('POSTs to Document.GetChildren with fetch-document header', done => {
      service.getHandlingWithFileProperties('handling-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.GetChildren');
      expect(req.request.headers.get('fetch-document')).toBe('properties');
      req.flush({ entries: [] });
    });
  });

  describe('getHandling', () => {
    it('GETs handling_search with default params', done => {
      service.getHandling('parent-1', 25, 0, 0).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('handling_search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });

    it('adds sortBy and sortOrder when provided', done => {
      service.getHandling('parent-1', 25, 0, 0, 'dc:title', 'desc').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('handling_search'));
      expect(req.request.params.get('sortBy')).toBe('dc:title');
      expect(req.request.params.get('sortOrder')).toBe('DESC');
      req.flush({ entries: [] });
    });

    it('adds dublincore_title param when searchTerm is provided', done => {
      service.getHandling('parent-1', 25, 0, 0, undefined, undefined, undefined, 'search text').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('handling_search'));
      expect(req.request.params.get('dublincore_title')).toContain('search text');
      req.flush({ entries: [] });
    });

    it('passes handlingsriktning array as JSON', done => {
      service.getHandling('parent-1', 25, 0, 0, undefined, undefined, ['incoming', 'outgoing']).subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('handling_search'));
      const riktning = req.request.params.get('handling_handlingsriktning_agg');
      expect(riktning).toContain('incoming');
      req.flush({ entries: [] });
    });
  });

  describe('getUtkastsByParent', () => {
    it('POSTs to Repository.Query for Utkast', done => {
      service.getUtkastsByParent('parent-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.body.params.query).toContain('Utkast');
      req.flush({ entries: [] });
    });

    it('includes ORDER BY when sortBy is provided', done => {
      service.getUtkastsByParent('parent-1', { sortBy: 'dc:title', sortOrder: 'desc' }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.body.params.query).toContain('ORDER BY dc:title DESC');
      req.flush({ entries: [] });
    });

    it('includes fetch-document header when shouldRequestProps is true', done => {
      service.getUtkastsByParent('parent-1', {}, true).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.headers.get('fetch-document')).toBe('properties');
      req.flush({ entries: [] });
    });
  });

  describe('getFilteredHandlingWithFile', () => {
    it('POSTs to Repository.Query with base query', done => {
      service.getFilteredHandlingWithFile('parent-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.method).toBe('POST');
      req.flush({ entries: [] });
    });

    it('includes search filter when opts.search is provided', done => {
      service.getFilteredHandlingWithFile('parent-1', { search: 'my doc' }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.body.params.query).toContain("dc:title ILIKE '%my doc%'");
      req.flush({ entries: [] });
    });

    it('includes pathStartsWith filter when opts.pathStartsWith is provided', done => {
      service.getFilteredHandlingWithFile('parent-1', { pathStartsWith: '/root/path' }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.body.params.query).toContain("ecm:path STARTSWITH '/root/path'");
      req.flush({ entries: [] });
    });

    it('includes ORDER BY when opts.sortBy is provided', done => {
      service.getFilteredHandlingWithFile('parent-1', { sortBy: 'dc:title', sortOrder: 'asc' }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Repository.Query');
      expect(req.request.body.params.query).toContain('ORDER BY dc:title');
      req.flush({ entries: [] });
    });
  });

  describe('createHandlingFromUtkast', () => {
    it('POSTs to Document.UtkastToHandling', done => {
      service.createHandlingFromUtkast('utkast-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.UtkastToHandling');
      expect(req.request.body.input).toBe('utkast-1');
      req.flush({ uid: 'handling-1' });
    });
  });

  describe('markCaseReadyToClose', () => {
    it('throws error when utkast documents still exist', done => {
      service.markCaseReadyToClose('case-1').subscribe({
        error: err => {
          expect(err.message).toContain('utkast');
          done();
        },
      });
      const req = httpMock.expectOne(r => r.url.includes('nxql_search'));
      req.flush({ entries: [{ uid: 'utkast-1' }] });
    });

    it('calls FollowLifecycleTransition when no utkast exist', done => {
      service.markCaseReadyToClose('case-1').subscribe(() => done());

      const searchReq = httpMock.expectOne(r => r.url.includes('nxql_search'));
      searchReq.flush({ entries: [] });

      const transitionReq = httpMock.expectOne('/nuxeo/api/v1/automation/Document.FollowLifecycleTransition');
      expect(transitionReq.request.body.params.value).toBe('to_avslutatAvHandlaggare');
      transitionReq.flush({});
    });
  });

  describe('getAncestorsById - permission error branch', () => {
    it('returns empty array on permission error', done => {
      service.getAncestorsById('doc-restricted').subscribe(result => {
        expect(result).toEqual([]);
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/nuxeo/api/v1/id/doc-restricted'));
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('getRenderedMailTemplate', () => {
    it('POSTs to DMS.Mail.GetRenderedMailTemplate', done => {
      service.getRenderedMailTemplate('tpl-1', 'doc-1').subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Mail.GetRenderedMailTemplate');
      expect(req.request.method).toBe('POST');
      req.flush({ subject: 'Subject', content: 'Content' });
    });
  });

  describe('LaddanerZipExport', () => {
    it('POSTs to DMS.Export.LaddanerZipExport with options', done => {
      service
        .LaddanerZipExport('arende-1', ['file-1'], {
          exportOriginalContent: true,
          exportPDFRenditionContent: false,
          exportWatermarkedContent: false,
        })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/DMS.Export.LaddanerZipExport');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.params.exportOriginalContent).toBe(true);
      req.flush(new Blob(), { headers: { 'Content-Type': 'application/zip' } });
    });
  });

  describe('advanceCaseLifecycle - edge cases', () => {
    it('returns of(void) when currentState is null', done => {
      service.advanceCaseLifecycle('case-1', null, 'underHandlaggning').subscribe(() => done());
    });

    it('executes multiple sequential lifecycle transitions', done => {
      service.advanceCaseLifecycle('case-1', 'registrerat', 'beslutat').subscribe(() => done());

      const req1 = httpMock.expectOne('/nuxeo/api/v1/automation/Document.FollowLifecycleTransition');
      req1.flush({});

      const req2 = httpMock.expectOne('/nuxeo/api/v1/automation/Document.FollowLifecycleTransition');
      req2.flush({});

      const req3 = httpMock.expectOne('/nuxeo/api/v1/automation/Document.FollowLifecycleTransition');
      req3.flush({});
    });
  });

  describe('queryAuditEntries - sortOrder branch', () => {
    it('includes uppercased sortOrder when sortBy is also provided', done => {
      service
        .queryAuditEntries({ currentPageIndex: 0, pageSize: 25, sortBy: 'eventDate', sortOrder: 'desc' })
        .subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Audit.QueryWithPageProvider');
      expect(req.request.body.params.sortOrder).toBe('DESC');
      req.flush({ entries: [] });
    });

    it('sets sortOrder to undefined when sortBy is not provided', done => {
      service.queryAuditEntries({ currentPageIndex: 0, pageSize: 25, sortOrder: 'asc' }).subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Audit.QueryWithPageProvider');
      expect(req.request.body.params.sortOrder).toBeUndefined();
      req.flush({ entries: [] });
    });
  });

  describe('getCollections - response mapping', () => {
    it('maps entries using properties fields', done => {
      service.getCollections().subscribe(result => {
        expect(result[0].title).toBe('My Collection');
        expect(result[0].uid).toBe('col-1');
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('user_collections'));
      req.flush({
        entries: [
          {
            uid: 'col-1',
            title: 'My Collection',
            lastModified: '2024-01-01',
            properties: {
              'dc:title': 'My Collection',
              'dc:modified': '2024-01-01',
              'dc:creator': {
                id: 'alice',
                properties: { firstName: 'Alice', lastName: 'Smith' },
              },
            },
          },
        ],
      });
    });

    it('uses title fallback and (okänd) for missing creator', done => {
      service.getCollections().subscribe(result => {
        expect(result[0].property).toBe('(okänd)');
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('user_collections'));
      req.flush({
        entries: [
          {
            uid: 'col-2',
            title: 'Fallback Title',
            lastModified: '2024-01-01',
            properties: {},
          },
        ],
      });
    });
  });

  describe('saveChecklist', () => {
    it('POSTs to Checklistor path', done => {
      service.saveChecklist().subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Checklistor'));
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('getDeletedFiles - with sortBy', () => {
    it('adds sortBy and sortOrder params when provided', done => {
      service.getDeletedFiles(0, 25, 'dc:modified', 'desc').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('default_trash_search'));
      expect(req.request.params.get('sortBy')).toBe('dc:modified');
      expect(req.request.params.get('sortOrder')).toBe('DESC');
      req.flush({ entries: [] });
    });
  });

  describe('deleteSelectedFiles - single string input', () => {
    it('handles string input', done => {
      service.deleteSelectedFiles('doc-1').subscribe(() => done());
      const req = httpMock.expectOne(r => r.url.includes('Document.Delete'));
      expect(req.request.body.input).toBe('docs:doc-1');
      req.flush({ entries: [] });
    });
  });
});
