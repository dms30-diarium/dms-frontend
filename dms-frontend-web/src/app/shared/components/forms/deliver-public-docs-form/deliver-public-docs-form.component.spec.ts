import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DeliverPublicDocsFormComponent } from './deliver-public-docs-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';

describe('DeliverPublicDocsFormComponent', () => {
  let component: DeliverPublicDocsFormComponent;
  let fixture: ComponentFixture<DeliverPublicDocsFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getMailTemplates',
      'getHandlingTypes',
      'sendCaseEmail',
      'getDocumentById',
      'getRenderedMailTemplate',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getMailTemplates.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.getHandlingTypes.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.sendCaseEmail.and.returnValue(of({}));
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getRenderedMailTemplate.and.returnValue(of({ content: '', subject: '' }));

    await TestBed.configureTestingModule({
      imports: [DeliverPublicDocsFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(DeliverPublicDocsFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DeliverPublicDocsFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('caseId', 'case-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getMailTemplates', () => {
      expect(apiSpy.getMailTemplates).toHaveBeenCalled();
    });

    it('calls getHandlingTypes', () => {
      expect(apiSpy.getHandlingTypes).toHaveBeenCalled();
    });

    it('sets templateOptions from API response', () => {
      apiSpy.getMailTemplates.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 't1', title: 'Template A' })] }))
      );
      component.ngOnInit();
      expect(component.templateOptions().length).toBe(1);
      expect(component.templateOptions()[0].label).toBe('Template A');
    });

    it('sets handlingTypeOptions with fallback when entries empty', () => {
      apiSpy.getHandlingTypes.and.returnValue(of(makeSearchResult({ entries: [] })));
      component.ngOnInit();
      expect(component.handlingTypeOptions()[0].id).toBe('none');
    });
  });

  describe('signals initial state', () => {
    it('isSubmitting defaults to false', () => {
      expect(component.isSubmitting()).toBeFalse();
    });

    it('attachedFileIds defaults to empty array', () => {
      expect(component.attachedFileIds()).toEqual([]);
    });

    it('copyRecipients defaults to empty object', () => {
      expect(component.copyRecipients()).toEqual({});
    });

    it('emailFormConfig is populated', () => {
      expect(component.emailFormConfig().length).toBeGreaterThan(0);
    });
  });

  describe('updateSelectedFiles', () => {
    it('sets attachedFileIds', () => {
      component.updateSelectedFiles(['file-a', 'file-b']);
      expect(component.attachedFileIds()).toEqual(['file-a', 'file-b']);
    });
  });

  describe('handleFormResult', () => {
    it('does not call sendCaseEmail when recipients is empty', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: '', subject: 'S', mailBody: 'B' });
      expect(apiSpy.sendCaseEmail).not.toHaveBeenCalled();
    });

    it('does not call sendCaseEmail when recipients has invalid email', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: 'bad-email', subject: 'S', mailBody: 'B' });
      expect(apiSpy.sendCaseEmail).not.toHaveBeenCalled();
    });

    it('calls sendCaseEmail with valid recipient', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: 'a@b.com', subject: 'Sub', mailBody: 'Body' });
      expect(apiSpy.sendCaseEmail).toHaveBeenCalledWith(
        'case-1',
        jasmine.objectContaining({
          recipients: ['a@b.com'],
          subject: 'Sub',
        })
      );
    });

    it('emits emailSent and closeDialog on success', () => {
      let sent = false;
      let closed = false;
      component.emailSent.subscribe(() => (sent = true));
      component.closeDialog.subscribe(() => (closed = true));
      component.handleFormResult({ recipients: 'a@b.com', subject: 'S', mailBody: 'B' });
      expect(sent).toBeTrue();
      expect(closed).toBeTrue();
    });

    it('includes attachedFileIds in payload', () => {
      component.updateSelectedFiles(['file-1']);
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: 'a@b.com', subject: 'S', mailBody: 'B' });
      expect(apiSpy.sendCaseEmail).toHaveBeenCalledWith(
        'case-1',
        jasmine.objectContaining({
          attachedHandlingar: ['file-1'],
        })
      );
    });
  });

  describe('emailFormConfig', () => {
    it('includes recipients field', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('recipients');
    });

    it('includes subject field', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('subject');
    });
  });
});
