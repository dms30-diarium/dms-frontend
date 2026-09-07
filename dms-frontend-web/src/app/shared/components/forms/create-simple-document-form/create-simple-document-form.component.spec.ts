import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateSimpleDocumentFormComponent } from './create-simple-document-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'MyDoc', title: '', properties: {} });
const MOCK_DOC = makeNuxeoDocument({ uid: 'd-1', type: 'MyDoc', title: 'D', properties: {} });

describe('CreateSimpleDocumentFormComponent', () => {
  let component: CreateSimpleDocumentFormComponent;
  let fixture: ComponentFixture<CreateSimpleDocumentFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getEmptyWithDefaults', 'createDocument']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(MOCK_DOC));

    await TestBed.configureTestingModule({
      imports: [CreateSimpleDocumentFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateSimpleDocumentFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateSimpleDocumentFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/docs');
    fixture.componentRef.setInput('docType', 'CustomDoc');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults with path and docType', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/docs', 'CustomDoc');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(MOCK_PAYLOAD);
    });
  });

  describe('inputs', () => {
    it('formName defaults to "New Document"', () => {
      expect(component.formName()).toBe('New Document');
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('formConfig has 2 fields', () => {
      expect(component.formConfig().length).toBe(2);
    });

    it('includes title and description fields', () => {
      const names = component.formConfig().map(f => f.name);
      expect(names).toContain('title');
      expect(names).toContain('description');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload = null;
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Document', description: 'Desc' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Document' }),
        '/domain/docs'
      );
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
