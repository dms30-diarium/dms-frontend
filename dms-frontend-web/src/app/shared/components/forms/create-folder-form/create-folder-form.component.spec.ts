import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateCaseFolderComponent } from './create-folder-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Ar', title: '' });
const MOCK_DOC = makeNuxeoDocument({ uid: 'ar-1', type: 'Ar', title: 'A' });

describe('CreateCaseFolderComponent', () => {
  let component: CreateCaseFolderComponent;
  let fixture: ComponentFixture<CreateCaseFolderComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getEmptyWithDefaults',
      'createDocument',
      'DMSDocumentSuggestion',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(MOCK_DOC));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));

    await TestBed.configureTestingModule({
      imports: [CreateCaseFolderComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateCaseFolderComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateCaseFolderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parentUid', 'parent-uid-1');
    fixture.componentRef.setInput('path', '/domain/ar');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for Ar', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/ar', 'Ar');
    });

    it('calls DMSDocumentSuggestion for Klassificeringsstruktur', () => {
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-uid-1', 'Klassificeringsstruktur', 'Ar');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(MOCK_PAYLOAD);
    });

    it('populates klass dropdown options from DMSDocumentSuggestion', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ title: 'Klass1', uid: 'k-1', path: '/k1' })] }))
      );
      component.ngOnInit();
      const klassField = component.createFolderConfig().find(f => f.name === 'klass');
      expect(klassField?.options?.length).toBe(1);
      expect(klassField?.options?.[0].id).toBe('k-1');
    });
  });

  describe('signals initial state', () => {
    it('createFolderConfig has 3 fields', () => {
      expect(component.createFolderConfig().length).toBe(3);
    });

    it('includes year, name, klass fields', () => {
      const names = component.createFolderConfig().map(f => f.name);
      expect(names).toContain('year');
      expect(names).toContain('name');
      expect(names).toContain('klass');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload = null;
      expect(() => component.createDocument({ name: 'N', year: '2024', klass: 'k-1' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'MyFolder', year: '2024', klass: 'k-1' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'MyFolder' }), '/domain/ar');
    });

    it('emits dialogClosed on success', () => {
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ name: 'N', year: '2024', klass: 'k-1' });
      expect(emitted).toBeTruthy();
    });

    it('maps year to ar:ar property', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'N', year: '2025', klass: 'k-1' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      const arKey = Object.keys(payload.properties).find(k => k.includes(':ar'));
      expect((payload.properties as Record<string, unknown>)[arKey!]).toBe('2025');
    });
  });
});
