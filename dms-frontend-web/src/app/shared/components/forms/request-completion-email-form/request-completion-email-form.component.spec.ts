import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { RequestCompletionEmailFormComponent } from './request-completion-email-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { ArendeExtendedProperties, HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

type DocUnion = NuxeoDocument<HandlingExtendedProperties | ArendeExtendedProperties>;

function makeHandlingDoc(overrides: Record<string, unknown> = {}): DocUnion {
  return makeNuxeoDocument<HandlingExtendedProperties | ArendeExtendedProperties>({
    uid: 'handling-1',
    type: 'Handling',
    title: 'Test Handling',
    properties: {
      [NUXEO_SCHEMA_FIELDS.handling.sekretess]: null,
      [NUXEO_SCHEMA_FIELDS.handling.avsandare]: [],
      [NUXEO_SCHEMA_FIELDS.handling.mottagare]: [],
      [NUXEO_SCHEMA_FIELDS.handling.handlingsnummer]: 'H2024-001',
      [NUXEO_SCHEMA_FIELDS.handling.arendenummer]: null,
      ...overrides,
    } as unknown as HandlingExtendedProperties,
  });
}

function makeArendeDoc(overrides: Record<string, unknown> = {}): DocUnion {
  return makeNuxeoDocument<HandlingExtendedProperties | ArendeExtendedProperties>({
    uid: 'arende-1',
    type: 'Arende',
    title: 'Test Arende',
    properties: {
      [NUXEO_SCHEMA_FIELDS.arende.sekretess]: null,
      [NUXEO_SCHEMA_FIELDS.arende.arendepart]: null,
      [NUXEO_SCHEMA_FIELDS.arende.mottagare]: [],
      [NUXEO_SCHEMA_FIELDS.arende.arendenummer]: 'A2024-001',
      ...overrides,
    } as unknown as ArendeExtendedProperties,
  });
}

function createApiSpy() {
  const spy = jasmine.createSpyObj('NuxeoApiService', [
    'getMessagesJSON',
    'getMailTemplates',
    'sendCaseEmail',
    'getDocumentById',
  ]);
  spy.getMessagesJSON.and.returnValue(of({}));
  spy.getMailTemplates.and.returnValue(of(makeSearchResult({ entries: [] })));
  spy.sendCaseEmail.and.returnValue(of({}));
  spy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
  return spy;
}

describe('RequestCompletionEmailFormComponent', () => {
  let component: RequestCompletionEmailFormComponent;
  let fixture: ComponentFixture<RequestCompletionEmailFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  async function setupWithDoc(doc: DocUnion) {
    fixture.componentRef.setInput('caseId', 'case-1');
    fixture.componentRef.setInput('document', doc);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    apiSpy = createApiSpy();

    await TestBed.configureTestingModule({
      imports: [RequestCompletionEmailFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(RequestCompletionEmailFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(RequestCompletionEmailFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', async () => {
    await setupWithDoc(makeHandlingDoc());
    expect(component).toBeTruthy();
  });

  describe('ngOnInit with Handling doc', () => {
    beforeEach(async () => setupWithDoc(makeHandlingDoc()));

    it('calls getMailTemplates', () => {
      expect(apiSpy.getMailTemplates).toHaveBeenCalled();
    });

    it('isSecretHandling defaults to false for non-secret handling', () => {
      expect(component.isSecretHandling()).toBeFalse();
    });

    it('emailFormConfig includes attachFiles checkbox for Handling type', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('attachFiles');
    });
  });

  describe('ngOnInit with secret Handling', () => {
    beforeEach(async () => {
      await setupWithDoc(
        makeHandlingDoc({
          [NUXEO_SCHEMA_FIELDS.handling.sekretess]: { id: NUXEO_VOCAB_IDS.sekretess.starkSekretess },
        })
      );
    });

    it('sets isSecretHandling to true', () => {
      expect(component.isSecretHandling()).toBeTrue();
    });
  });

  describe('ngOnInit with Arende doc', () => {
    beforeEach(async () => setupWithDoc(makeArendeDoc()));

    it('does not include attachFiles for Arende', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).not.toContain('attachFiles');
    });

    it('isSecretHandling stays false for Arende', () => {
      expect(component.isSecretHandling()).toBeFalse();
    });
  });

  describe('isHandling', () => {
    beforeEach(async () => setupWithDoc(makeHandlingDoc()));

    it('returns true when doc has handling:sekretess property', () => {
      expect(component.isHandling(makeHandlingDoc())).toBeTrue();
    });

    it('returns false when doc does not have handling:sekretess property', () => {
      expect(component.isHandling(makeArendeDoc())).toBeFalse();
    });
  });

  describe('isArende', () => {
    beforeEach(async () => setupWithDoc(makeArendeDoc()));

    it('returns true when doc has arende:sekretess property', () => {
      expect(component.isArende(makeArendeDoc())).toBeTrue();
    });

    it('returns false for handling doc', () => {
      expect(component.isArende(makeHandlingDoc())).toBeFalse();
    });
  });

  describe('signals initial state', () => {
    beforeEach(async () => setupWithDoc(makeHandlingDoc()));

    it('isSubmitting defaults to false', () => {
      expect(component.isSubmitting()).toBeFalse();
    });

    it('templateOptions defaults to empty array', () => {
      expect(component.templateOptions()).toEqual([]);
    });

    it('emailFormConfig has required fields', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('recipients');
      expect(names).toContain('mailBody');
      expect(names).toContain('template');
    });
  });

  describe('handleFormResult — standard handling', () => {
    beforeEach(async () => setupWithDoc(makeHandlingDoc()));

    it('does not call sendCaseEmail when recipients is empty', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: '', subject: 'S', mailBody: 'B' });
      expect(apiSpy.sendCaseEmail).not.toHaveBeenCalled();
    });

    it('does not call sendCaseEmail when invalid email', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: 'not-email', subject: 'S', mailBody: 'B' });
      expect(apiSpy.sendCaseEmail).not.toHaveBeenCalled();
    });

    it('calls sendCaseEmail with valid recipient', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({
        recipients: 'test@example.com',
        subject: 'Subject',
        mailBody: 'Body',
      });
      expect(apiSpy.sendCaseEmail).toHaveBeenCalledWith(
        'handling-1',
        jasmine.objectContaining({
          recipients: ['test@example.com'],
        })
      );
    });

    it('emits emailSent and closeDialog on success', () => {
      let sentEmit = false;
      let closeEmit = false;
      component.emailSent.subscribe(() => (sentEmit = true));
      component.closeDialog.subscribe(() => (closeEmit = true));
      component.handleFormResult({
        recipients: 'a@b.com',
        subject: 'S',
        mailBody: 'B',
      });
      expect(sentEmit).toBeTrue();
      expect(closeEmit).toBeTrue();
    });

    it('attaches files when not secret', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({
        recipients: 'a@b.com',
        subject: 'S',
        mailBody: 'B',
        attachFiles: true,
      });
      expect(apiSpy.sendCaseEmail).toHaveBeenCalledWith(
        'handling-1',
        jasmine.objectContaining({
          attachHandling: true,
        })
      );
    });
  });

  describe('handleFormResult — secret handling', () => {
    beforeEach(async () => {
      await setupWithDoc(
        makeHandlingDoc({
          [NUXEO_SCHEMA_FIELDS.handling.sekretess]: { id: NUXEO_VOCAB_IDS.sekretess.starkSekretess },
        })
      );
    });

    it('sets attachHandling to false for secret handling', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({
        recipients: 'a@b.com',
        subject: 'S',
        mailBody: 'B',
        attachFiles: true,
      });
      expect(apiSpy.sendCaseEmail).toHaveBeenCalledWith(
        'handling-1',
        jasmine.objectContaining({
          attachHandling: false,
        })
      );
    });
  });

  describe('onDropdownChanged', () => {
    beforeEach(async () => setupWithDoc(makeHandlingDoc()));

    it('ignores non-template field', () => {
      const countBefore = apiSpy.getDocumentById.calls.count();
      component.onDropdownChanged({ selectedValue: 'x', fieldName: 'other' });
      expect(apiSpy.getDocumentById.calls.count()).toBe(countBefore);
    });
  });

  describe('templateOptions', () => {
    beforeEach(async () => setupWithDoc(makeHandlingDoc()));

    it('populates from getMailTemplates response', () => {
      apiSpy.getMailTemplates.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'tmpl-1', title: 'Template 1' })] }))
      );
      component.ngOnInit();
      expect(component.templateOptions().length).toBe(1);
    });
  });
});
