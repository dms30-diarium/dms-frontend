import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateCvDocumentFormComponent } from './create-cv-document-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'CvDoc', title: '' });

describe('CreateCvDocumentFormComponent', () => {
  let component: CreateCvDocumentFormComponent;
  let fixture: ComponentFixture<CreateCvDocumentFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getEmptyWithDefaults', 'createDocument']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'cv-1', type: 'CvDoc', title: 'T' })));

    await TestBed.configureTestingModule({
      imports: [CreateCvDocumentFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateCvDocumentFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateCvDocumentFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/cv');
    fixture.componentRef.setInput('docType', 'Handlingstyp');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults with path and docType', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/cv', 'Handlingstyp');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(MOCK_PAYLOAD);
    });
  });

  describe('inputs', () => {
    it('formName defaults to "New Document"', () => {
      expect(component.formName()).toBe('New Document');
    });

    it('docType input is accessible', () => {
      expect(component.docType()).toBe('Handlingstyp');
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('formConfig has 9 fields', () => {
      expect(component.formConfig().length).toBe(9);
    });

    it('includes code, codeName, shortName, name fields', () => {
      const names = component.formConfig().map(f => f.name);
      expect(names).toContain('code');
      expect(names).toContain('codeName');
      expect(names).toContain('shortName');
      expect(names).toContain('name');
    });

    it('includes dateFrom and dateTill datepicker fields', () => {
      const types = component
        .formConfig()
        .filter(f => f.type === 'datepicker')
        .map(f => f.name);
      expect(types).toContain('dateFrom');
      expect(types).toContain('dateTill');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload = null;
      expect(() => component.createDocument({ name: 'N' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Title', name: 'Fallback', code: 'C1' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'My Title' }), '/domain/cv');
    });

    it('uses name as title when title is empty', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'NameValue', code: 'C1' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'NameValue' }), '/domain/cv');
    });

    it('sets cv:kod in properties', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'T', code: 'CV-001', name: 'N' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      const properties = payload.properties as Record<string, unknown>;
      const kodKey = Object.keys(properties).find(
        k => k.includes('kod') && !k.includes('kodnamn') && !k.includes('kortnamn')
      );
      expect(properties[kodKey!]).toBe('CV-001');
    });

    it('maps dateFrom array to first element', () => {
      const date = new Date('2024-01-01');
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'T', dateFrom: [date] });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      const properties = payload.properties as Record<string, unknown>;
      const giltigFranKey = Object.keys(properties).find(k => k.includes('giltigFran') || k.includes('giltig_fran'));
      expect(properties[giltigFranKey!]).toBe(date);
    });

    it('emits dialogClosed on success', () => {
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'T', name: 'N' });
      expect(emitted).toBeTruthy();
    });

    it('sets isLoading false after success', () => {
      component.createDocument({ title: 'T', name: 'N' });
      expect(component.isLoading()).toBeFalse();
    });
  });
});
