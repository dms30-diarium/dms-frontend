import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateKlassificComponent } from './create-klassific.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_DEFAULT_PAYLOAD = makeNuxeoDocument({ type: 'Klass', title: '' });

describe('CreateKlassificComponent', () => {
  let component: CreateKlassificComponent;
  let fixture: ComponentFixture<CreateKlassificComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getEmptyWithDefaults',
      'DMSDocumentSuggestion',
      'createDocument',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_DEFAULT_PAYLOAD));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'klass-1', type: 'Klass', title: 'K' })));

    await TestBed.configureTestingModule({
      imports: [CreateKlassificComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateKlassificComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateKlassificComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parentUid', 'parent-1');
    fixture.componentRef.setInput('path', '/domain/klass');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults with path and Klass type', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/klass', 'Klass');
    });

    it('calls DMSDocumentSuggestion for Beslut', () => {
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-1', 'Beslut', 'Klass');
    });

    it('calls DMSDocumentSuggestion for Handlingstyp', () => {
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-1', 'Handlingstyp', 'Klass');
    });

    it('calls DMSDocumentSuggestion for Klasstyp', () => {
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-1', 'Klasstyp', 'Klass');
    });

    it('sets defaultPayload after API call', () => {
      expect(component.defaultPayload).toEqual(MOCK_DEFAULT_PAYLOAD);
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('createKlassificConfig has 7 fields', () => {
      expect(component.createKlassificConfig().length).toBe(7);
    });

    it('includes code field', () => {
      const names = component.createKlassificConfig().map(f => f.name);
      expect(names).toContain('code');
    });

    it('includes registrerbar checkbox', () => {
      const field = component.createKlassificConfig().find(f => f.name === 'registrerbar');
      expect(field?.type).toBe('checkbox');
    });

    it('includes metadataDefinition component field', () => {
      const field = component.createKlassificConfig().find(f => f.name === 'metadataDefinition');
      expect(field?.type).toBe('component');
    });
  });

  describe('createDocument', () => {
    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'Klass 1', code: 'K1', klass: 'typ-1', beslutstyper: [], handlingstyper: [] });
      expect(apiSpy.createDocument).toHaveBeenCalled();
    });

    it('uses code + name as dc:title', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'Min Klass', code: 'MK1', klass: [], beslutstyper: [], handlingstyper: [] });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect((payload.properties as Record<string, unknown>)['dc:title']).toBe('MK1 Min Klass');
    });

    it('emits dialogClosed on success', () => {
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ name: 'K', code: 'C1', klass: [], beslutstyper: [], handlingstyper: [] });
      expect(emitted).toBeTruthy();
    });

    it('passes parentRef as name', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'K', code: 'C', klass: [], beslutstyper: [], handlingstyper: [] });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect(payload.name).toBe('K');
    });

    it('includes registrerbar defaulting to false', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'K', code: 'C', klass: [], beslutstyper: [], handlingstyper: [] });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      const key = 'klass:registrerbar';
      expect((payload.properties as Record<string, unknown>)[key]).toBeFalse();
    });

    it('handles string klass value', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'K', code: 'C', klass: 'single-type', beslutstyper: [], handlingstyper: [] });
      expect(apiSpy.createDocument).toHaveBeenCalled();
    });

    it('handles array beslutstyper', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'K', code: 'C', klass: [], beslutstyper: ['b1', 'b2'], handlingstyper: [] });
      expect(apiSpy.createDocument).toHaveBeenCalled();
    });
  });

  describe('DMSDocumentSuggestion options loading', () => {
    it('populates beslutstyper field options', () => {
      apiSpy.DMSDocumentSuggestion.and.callFake((_parentUid: string, docType: string) => {
        if (docType === 'Beslut') {
          return of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'b1', title: 'Beslut 1', path: '/b1' })] }));
        }
        return of(makeSearchResult({ entries: [] }));
      });
      component.ngOnInit();
      const field = component.createKlassificConfig().find(f => f.label === 'Beslutstyper');
      expect(field?.options?.length).toBe(1);
    });
  });
});
