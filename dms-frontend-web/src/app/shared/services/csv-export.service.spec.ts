import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { CSVExportService, CSVExportColumnSource } from './csv-export.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';

describe('CSVExportService', () => {
  let service: CSVExportService;
  let httpMock: HttpTestingController;
  let storeSpy: jasmine.SpyObj<GeneralStore>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    storeSpy = jasmine.createSpyObj('GeneralStore', [], {
      notification: { set: jasmine.createSpy('set') },
    });
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        CSVExportService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: GeneralStore, useValue: storeSpy },
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(CSVExportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getExportColumns', () => {
    const cols: CSVExportColumnSource[] = [
      { label: 'Title', key: 'title', sortField: 'dc:title' },
      { label: 'Status', key: 'actions' },
      { label: 'Case', key: 'case:id', sortField: 'case:id' },
      { label: 'Ref', key: 'ref', searchField: 'refField' },
      { label: 'Dup', key: 'dupField', sortField: 'dupField' },
      { label: 'Dup2', key: 'dupField2', sortField: 'dupField' },
    ];

    it('excludes columns with "actions" field', () => {
      const result = service.getExportColumns(cols, []);
      expect(result.map(c => c.field)).not.toContain('actions');
    });

    it('excludes columns with case: prefix', () => {
      const result = service.getExportColumns(cols, []);
      expect(result.map(c => c.field)).not.toContain('case:id');
    });

    it('excludes explicitly excluded fields', () => {
      const result = service.getExportColumns(cols, ['refField']);
      expect(result.map(c => c.field)).not.toContain('refField');
    });

    it('deduplicates columns by field', () => {
      const result = service.getExportColumns(cols, []);
      const fields = result.map(c => c.field);
      const unique = new Set(fields);
      expect(fields.length).toBe(unique.size);
    });

    it('uses sortField over key when available', () => {
      const result = service.getExportColumns([{ label: 'T', key: 'myKey', sortField: 'mySortField' }], []);
      expect(result[0].field).toBe('mySortField');
    });

    it('falls back to searchField when no sortField', () => {
      const result = service.getExportColumns([{ label: 'R', key: 'myKey', searchField: 'mySearch' }], []);
      expect(result[0].field).toBe('mySearch');
    });

    it('falls back to key when no sortField or searchField', () => {
      const result = service.getExportColumns([{ label: 'K', key: 'myKey' }], []);
      expect(result[0].field).toBe('myKey');
    });
  });

  describe('notifyError', () => {
    it('sets danger notification', () => {
      service.notifyError('Something went wrong');
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger', text: 'Something went wrong' })
      );
    });
  });

  describe('notifyNoExportableColumns', () => {
    it('sets danger notification', () => {
      service.notifyNoExportableColumns();
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });
  });

  describe('exportToCSV', () => {
    it('posts to async export URL', () => {
      service.exportToCSV({
        headers: ['A'],
        fields: ['a'],
        providerName: 'test',
        currentPageIndex: 0,
        offset: 0,
        pageSize: 25,
        namedParameters: {},
        queryParams: [],
      });

      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Export.CSVExport/@async');
      expect(req.request.method).toBe('POST');
      req.flush({}, { headers: { location: '/nuxeo/site/api/v1/automation/Export.CSVExport/@async/abc123/status' } });
    });

    it('shows loading notification', () => {
      service.exportToCSV({
        headers: [],
        fields: [],
        providerName: 'test',
        currentPageIndex: 0,
        offset: 0,
        pageSize: 25,
        namedParameters: {},
        queryParams: [],
      });

      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Export.CSVExport/@async');
      req.flush({});
      expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'info' }));
    });

    it('notifies error on HTTP failure', () => {
      service.exportToCSV({
        headers: [],
        fields: [],
        providerName: 'test',
        currentPageIndex: 0,
        offset: 0,
        pageSize: 25,
        namedParameters: {},
        queryParams: [],
      });

      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Export.CSVExport/@async');
      req.error(new ProgressEvent('error'));
      expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('exportRowsToCSV', () => {
    it('calls download without throwing', () => {
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
      spyOn(URL, 'revokeObjectURL');

      const linkSpy = jasmine.createSpyObj('link', ['click']);
      spyOn(document, 'createElement').and.returnValue(linkSpy);

      service.exportRowsToCSV({
        headers: ['Name', 'Date'],
        rows: [
          ['Alice', '2024-01-01'],
          ['Bob', '2024-06-15'],
        ],
        filename: 'test-export',
      });

      expect(linkSpy.click).toHaveBeenCalled();
    });
  });
});
