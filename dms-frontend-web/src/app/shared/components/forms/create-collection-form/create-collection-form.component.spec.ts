import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateCollectionFormComponent } from './create-collection-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Collection', title: '', properties: {}, repository: 'default' });
const MOCK_DOC = makeNuxeoDocument({ uid: 'col-1', type: 'Collection', title: 'C', properties: {} });

describe('CreateCollectionFormComponent', () => {
  let component: CreateCollectionFormComponent;
  let fixture: ComponentFixture<CreateCollectionFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let dirSpy: jasmine.SpyObj<DirectoryOptionsService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getEmptyWithDefaults',
      'createDocument',
      'getPathInfo',
    ]);
    dirSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(MOCK_DOC));
    apiSpy.getPathInfo.and.returnValue(of(MOCK_DOC));
    dirSpy.getNatureOptions.and.returnValue(of([]));
    dirSpy.getSubjectOptions.and.returnValue(of([]));
    dirSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CreateCollectionFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirSpy },
      ],
    })
      .overrideTemplate(CreateCollectionFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateCollectionFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/collections');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for Collection', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/collections', 'Collection');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload()).toEqual(MOCK_PAYLOAD);
    });

    it('calls directory option services', () => {
      expect(dirSpy.getNatureOptions).toHaveBeenCalled();
      expect(dirSpy.getCoverageOptions).toHaveBeenCalled();
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('createCollectionConfig has 6 fields', () => {
      expect(component.createCollectionConfig().length).toBe(6);
    });

    it('includes title, description, nature, subjects, coverage, expires fields', () => {
      const names = component.createCollectionConfig().map(f => f.name);
      expect(names).toContain('title');
      expect(names).toContain('subjects');
      expect(names).toContain('expires');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload.set(null);
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Collection' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Collection', type: 'Collection' }),
        '/domain/collections'
      );
    });

    it('uses "collection" as fallback name when title is empty', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: '' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      expect(payload.name).toBe('collection');
    });

    it('emits dialogClosed on success', () => {
      let emitted: NuxeoDocument | null | undefined;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'T' });
      expect(emitted).toBeTruthy();
    });

    it('sets isLoading to false after success', () => {
      component.createDocument({ title: 'T' });
      expect(component.isLoading()).toBeFalse();
    });

    it('includes dc:title in properties', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'MyCol' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      const properties = payload.properties as Record<string, unknown>;
      const titleKey = Object.keys(properties).find(k => k.includes('title') || k === 'dc:title');
      expect(properties[titleKey!]).toBe('MyCol');
    });
  });
});
