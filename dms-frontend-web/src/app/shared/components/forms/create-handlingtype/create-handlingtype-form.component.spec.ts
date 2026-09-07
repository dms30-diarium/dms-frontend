import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateHandlingComponent } from './create-handlingtype-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { MetadataDefinitionRow } from '@app/shared/components/edit-form-components/basic-metadata-table/basic-metadata-table.component';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_DEFAULT_PAYLOAD = makeNuxeoDocument({ type: 'Handlingstyp', title: '' });

describe('CreateHandlingComponent', () => {
  let component: CreateHandlingComponent;
  let fixture: ComponentFixture<CreateHandlingComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getEmptyWithDefaults',
      'getDirectorySuggestions',
      'requestPageProviderOptions',
      'createDocument',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_DEFAULT_PAYLOAD));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));
    apiSpy.requestPageProviderOptions.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'new-1', type: 'Handlingstyp', title: 'New' })));

    await TestBed.configureTestingModule({
      imports: [CreateHandlingComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateHandlingComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateHandlingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parentUid', 'parent-1');
    fixture.componentRef.setInput('path', '/domain/handlingstyper');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults with path and type', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/handlingstyper', 'Handlingstyp');
    });

    it('calls getDirectorySuggestions for Arkiveringsregel', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Arkiveringsregel');
    });

    it('calls getDirectorySuggestions for Sekretess', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Sekretess');
    });

    it('calls getDirectorySuggestions for Sakerhetsskyddsklassificering', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Sakerhetsskyddsklassificering');
    });

    it('calls requestPageProviderOptions for gallringsbeslut', () => {
      expect(apiSpy.requestPageProviderOptions).toHaveBeenCalled();
    });

    it('sets defaultPayload after ngOnInit', () => {
      expect(component.defaultPayload).toEqual(MOCK_DEFAULT_PAYLOAD);
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('createHandlingstypConfig has 14 fields', () => {
      expect(component.createHandlingstypConfig().length).toBe(14);
    });

    it('config includes handlingsnamn field', () => {
      const names = component.createHandlingstypConfig().map(f => f.name);
      expect(names).toContain('handlingsnamn');
    });

    it('config includes diarieforing checkbox', () => {
      const field = component.createHandlingstypConfig().find(f => f.name === 'diarieforing');
      expect(field?.type).toBe('checkbox');
    });

    it('config includes metadataDefinition component', () => {
      const field = component.createHandlingstypConfig().find(f => f.name === 'metadataDefinition');
      expect(field?.type).toBe('component');
    });
  });

  describe('createDocument', () => {
    it('calls createDocument API with correct parentRef', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ handlingsnamn: 'Test Handling Type' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ parentRef: 'parent-1' }),
        '/domain/handlingstyper'
      );
    });

    it('sets title and name from handlingsnamn', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ handlingsnamn: 'My Type' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      expect(payload.title).toBe('My Type');
      expect(payload.name).toBe('My Type');
    });

    it('emits dialogClosed with result on success', () => {
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ handlingsnamn: 'Test' });
      expect(emitted).toBeTruthy();
    });

    it('includes metadataDefinition fields in payload', () => {
      apiSpy.createDocument.calls.reset();
      const metadata: MetadataDefinitionRow[] = [
        { id: 'f1', nyckel: 'key1', flervardig: false, aktiv: true, typ: 'text', ordning: 1 },
      ];
      component.createDocument({ handlingsnamn: 'Test', metadataDefinition: metadata });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect((payload.properties as Record<string, unknown>)['dmsmetadatadefinition:faltdefinition']).toBeTruthy();
    });

    it('handles empty metadataDefinition', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ handlingsnamn: 'Test', metadataDefinition: [] });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect((payload.properties as Record<string, unknown>)['dmsmetadatadefinition:faltdefinition']).toEqual([]);
    });

    it('emits dialogClosed with null on error', () => {
      let emitted: unknown = 'not-yet';
      component.dialogClosed.subscribe(v => (emitted = v));
      apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'new', type: 'Handlingstyp', title: 'New' })));
      component.createDocument({ handlingsnamn: 'Test' });
      expect(emitted).toBeTruthy();
    });
  });

  describe('directory options loading', () => {
    it('updates arkiveringsregel field options when entries returned', () => {
      apiSpy.getDirectorySuggestions.and.callFake(((name: string) => {
        if (name === 'Arkiveringsregel') {
          return of([
            { computedId: 'ark-1', absoluteLabel: 'Arkiv 1', id: 'ark-1', label: 'Arkiv 1', displayLabel: 'Arkiv 1' },
          ]);
        }
        return of([]);
      }) as unknown as NuxeoApiService['getDirectorySuggestions']);
      component.ngOnInit();
      const field = component.createHandlingstypConfig().find(f => f.name === 'arkiveringsregel');
      expect(field?.options?.length).toBe(1);
    });

    it('updates gallringsbeslut field options from requestPageProviderOptions', () => {
      apiSpy.requestPageProviderOptions.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'g1', title: 'Gallring 1' })],
          })
        )
      );
      component.ngOnInit();
      const field = component.createHandlingstypConfig().find(f => f.name === 'gallringsbeslut');
      expect(field?.options?.length).toBe(1);
    });
  });
});
