import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SendEmailFormComponent } from './send-email-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';

describe('SendEmailFormComponent', () => {
  let component: SendEmailFormComponent;
  let fixture: ComponentFixture<SendEmailFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getMailTemplates',
      'getDirectorySuggestions',
      'getHandlingTypes',
      'sendCaseEmail',
      'createHandlingFromNote',
      'getDocumentById',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getMailTemplates.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));
    apiSpy.getHandlingTypes.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.sendCaseEmail.and.returnValue(of({}));
    apiSpy.createHandlingFromNote.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));

    await TestBed.configureTestingModule({
      imports: [SendEmailFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(SendEmailFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(SendEmailFormComponent);
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

    it('calls getDirectorySuggestions for Riktning', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Riktning');
    });

    it('calls getDirectorySuggestions for Sekretess', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Sekretess');
    });

    it('calls getHandlingTypes', () => {
      expect(apiSpy.getHandlingTypes).toHaveBeenCalled();
    });
  });

  describe('signals initial state', () => {
    it('isSubmitting defaults to false', () => {
      expect(component.isSubmitting()).toBeFalse();
    });

    it('shouldUppratta defaults to true', () => {
      expect(component.shouldUppratta()).toBeTrue();
    });

    it('attachedFileIds defaults to empty array', () => {
      expect(component.attachedFileIds()).toEqual([]);
    });

    it('emailFormConfig is populated by effect', () => {
      expect(component.emailFormConfig().length).toBeGreaterThan(0);
    });
  });

  describe('updateSelectedFiles', () => {
    it('sets attachedFileIds signal', () => {
      component.updateSelectedFiles(['file-1', 'file-2']);
      expect(component.attachedFileIds()).toEqual(['file-1', 'file-2']);
    });
  });

  describe('changeForm', () => {
    it('sets shouldUppratta to false when uppratta is false', () => {
      component.changeForm({ uppratta: false });
      expect(component.shouldUppratta()).toBeFalse();
    });

    it('sets shouldUppratta to true when uppratta is true', () => {
      component.changeForm({ uppratta: true });
      expect(component.shouldUppratta()).toBeTrue();
    });
  });

  describe('onDropdownChanged', () => {
    it('ignores non-template fieldNames', () => {
      const countBefore = apiSpy.getDocumentById.calls.count();
      component.onDropdownChanged({ selectedValue: 'riktning-1', fieldName: 'riktning' });
      expect(apiSpy.getDocumentById.calls.count()).toBe(countBefore);
    });
  });

  describe('templateOptions', () => {
    it('populates from getMailTemplates response', () => {
      apiSpy.getMailTemplates.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'tmpl-1', title: 'Template 1' })] }))
      );
      component.ngOnInit();
      expect(component.templateOptions().length).toBe(1);
      expect(component.templateOptions()[0].id).toBe('tmpl-1');
    });

    it('handles entries with fallback uid to title mapping', () => {
      apiSpy.getMailTemplates.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ title: 'Fallback Template' })] }))
      );
      component.ngOnInit();
      expect(component.templateOptions()[0].label).toBe('Fallback Template');
    });
  });

  describe('handlingTypeOptions', () => {
    it('populates from getHandlingTypes response', () => {
      apiSpy.getHandlingTypes.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'ht-1', title: 'Handling Type 1' })] }))
      );
      component.ngOnInit();
      expect(component.handlingTypeOptions().length).toBe(1);
    });

    it('uses fallback label when entries is empty', () => {
      apiSpy.getHandlingTypes.and.returnValue(of(makeSearchResult({ entries: [] })));
      component.ngOnInit();
      expect(component.handlingTypeOptions()[0].id).toBe('none');
    });
  });

  describe('handleFormResult', () => {
    it('does not call sendCaseEmail when recipients is empty', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: '', subject: 'Test', mailBody: 'Body' });
      expect(apiSpy.sendCaseEmail).not.toHaveBeenCalled();
    });

    it('does not call sendCaseEmail when invalid email in recipients', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: 'not-an-email', subject: 'Test', mailBody: 'Body' });
      expect(apiSpy.sendCaseEmail).not.toHaveBeenCalled();
    });

    it('calls sendCaseEmail with valid recipients', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({
        recipients: 'user@example.com',
        subject: 'Test Subject',
        mailBody: 'Hello world',
        uppratta: false,
      });
      expect(apiSpy.sendCaseEmail).toHaveBeenCalledWith(
        'case-1',
        jasmine.objectContaining({
          recipients: ['user@example.com'],
          subject: 'Test Subject',
        })
      );
    });

    it('emits emailSent and closeDialog on success when uppratta is true', () => {
      let sentEmit = false;
      let closeEmit = false;
      component.emailSent.subscribe(() => (sentEmit = true));
      component.closeDialog.subscribe(() => (closeEmit = true));
      component.handleFormResult({
        recipients: 'user@example.com',
        subject: 'Test',
        mailBody: 'Body',
        uppratta: true,
        handlingName: 'Note',
      });
      expect(sentEmit).toBeTrue();
      expect(closeEmit).toBeTrue();
    });

    it('calls createHandlingFromNote when uppratta is true', () => {
      component.handleFormResult({
        recipients: 'user@example.com',
        subject: 'Test',
        mailBody: 'Body',
        uppratta: true,
        handlingName: 'Note name',
      });
      expect(apiSpy.createHandlingFromNote).toHaveBeenCalled();
    });
  });

  describe('emailFormConfig', () => {
    it('includes recipients field', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('recipients');
    });

    it('includes mailBody field', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('mailBody');
    });

    it('includes template dropdown-search field', () => {
      const tmplField = component.emailFormConfig().find(f => f.name === 'template');
      expect(tmplField?.type).toBe('dropdown-search');
    });
  });
});
