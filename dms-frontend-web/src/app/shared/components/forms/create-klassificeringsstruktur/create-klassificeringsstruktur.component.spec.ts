import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateKlassificeringsstrukturComponent } from './create-klassificeringsstruktur.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Klassificeringsstruktur', title: '', properties: {} });
const MOCK_DOC = makeNuxeoDocument({
  uid: 'k-1',
  type: 'Klassificeringsstruktur',
  title: 'K',
  properties: {},
});

describe('CreateKlassificeringsstrukturComponent', () => {
  let component: CreateKlassificeringsstrukturComponent;
  let fixture: ComponentFixture<CreateKlassificeringsstrukturComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getEmptyWithDefaults', 'createDocument']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(MOCK_DOC));

    await TestBed.configureTestingModule({
      imports: [CreateKlassificeringsstrukturComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateKlassificeringsstrukturComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateKlassificeringsstrukturComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parentUid', 'parent-1');
    fixture.componentRef.setInput('path', '/domain/klass');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults with default Klassificeringsstruktur docType', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/klass', 'Klassificeringsstruktur');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(MOCK_PAYLOAD);
    });
  });

  describe('inputs', () => {
    it('docType defaults to "Klassificeringsstruktur"', () => {
      expect(component.docType()).toBe('Klassificeringsstruktur');
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('createKlassificeringsstrukturConfig has 6 fields', () => {
      expect(component.createKlassificeringsstrukturConfig().length).toBe(6);
    });

    it('includes title, owner, purpose, version, validFrom, validTill', () => {
      const names = component.createKlassificeringsstrukturConfig().map(f => f.name);
      expect(names).toContain('title');
      expect(names).toContain('owner');
      expect(names).toContain('purpose');
      expect(names).toContain('version');
      expect(names).toContain('validFrom');
      expect(names).toContain('validTill');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload = null;
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'KlassStr', version: '1.0' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'KlassStr' }),
        '/domain/klass'
      );
    });

    it('maps validFrom array to first element', () => {
      apiSpy.createDocument.calls.reset();
      const date = new Date('2024-01-01');
      component.createDocument({ title: 'T', validFrom: [date] });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      const properties = payload.properties as Record<string, unknown>;
      const key = Object.keys(properties).find(k => k.includes('giltigFran') || k.includes('giltig_fran'));
      expect(properties[key!]).toBe(date);
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
  });
});
