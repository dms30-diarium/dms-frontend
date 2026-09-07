import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ExpeditHandlingComponent } from './expedit-handling.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { HandlingExtendedProperties } from '@app/shared/api/nuxeo-api.types';

function makeHandlingDoc(overrides: Record<string, unknown> = {}) {
  return makeNuxeoDocument<HandlingExtendedProperties>({
    uid: 'handling-1',
    type: 'Handling',
    title: 'Test Handling Title',
    properties: { ...overrides } as unknown as HandlingExtendedProperties,
  });
}

describe('ExpeditHandlingComponent', () => {
  let component: ExpeditHandlingComponent;
  let fixture: ComponentFixture<ExpeditHandlingComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getMailTemplates',
      'sendCaseEmail',
      'editDocument',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getMailTemplates.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.sendCaseEmail.and.returnValue(of({}));
    apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));

    await TestBed.configureTestingModule({
      imports: [ExpeditHandlingComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(ExpeditHandlingComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ExpeditHandlingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('caseId', 'case-1');
    fixture.componentRef.setInput('document', makeHandlingDoc());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getMailTemplates', () => {
      expect(apiSpy.getMailTemplates).toHaveBeenCalled();
    });

    it('populates emailFormConfig after init', () => {
      expect(component.emailFormConfig().length).toBeGreaterThan(0);
    });

    it('includes handlingName field from document title', () => {
      const nameField = component.emailFormConfig().find(f => f.name === 'handlingName');
      expect(nameField?.defaultValue).toBe('Test Handling Title');
    });

    it('includes recipients field', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('recipients');
    });

    it('includes handlingFormat radio field', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('handlingFormat');
    });

    it('includes template dropdown for digital format', () => {
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('template');
    });
  });

  describe('signals initial state', () => {
    it('isSubmitting defaults to false', () => {
      expect(component.isSubmitting()).toBeFalse();
    });

    it('selectedHandlingFormat defaults to digital', () => {
      expect(component.selectedHandlingFormat()).toBe('digital');
    });

    it('copyRecipients defaults to empty object', () => {
      expect(component.copyRecipients()).toEqual({});
    });

    it('templateOptions defaults to empty array', () => {
      expect(component.templateOptions()).toEqual([]);
    });
  });

  describe('selectedRadioChanged', () => {
    it('does nothing when fieldName is not handlingFormat', () => {
      const initialFormat = component.selectedHandlingFormat();
      component.selectedRadioChanged({ selectedValue: 'paper', fieldName: 'other' });
      expect(component.selectedHandlingFormat()).toBe(initialFormat);
    });

    it('sets selectedHandlingFormat to paper', () => {
      component.selectedRadioChanged({ selectedValue: 'paper', fieldName: 'handlingFormat' });
      expect(component.selectedHandlingFormat()).toBe('paper');
    });

    it('sets selectedHandlingFormat to digital for non-paper value', () => {
      component.selectedRadioChanged({ selectedValue: 'paper', fieldName: 'handlingFormat' });
      component.selectedRadioChanged({ selectedValue: 'digital', fieldName: 'handlingFormat' });
      expect(component.selectedHandlingFormat()).toBe('digital');
    });

    it('hides template field when format is paper', () => {
      component.selectedRadioChanged({ selectedValue: 'paper', fieldName: 'handlingFormat' });
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).not.toContain('template');
    });

    it('shows template field when format switches back to digital', () => {
      component.selectedRadioChanged({ selectedValue: 'paper', fieldName: 'handlingFormat' });
      component.selectedRadioChanged({ selectedValue: 'digital', fieldName: 'handlingFormat' });
      const names = component.emailFormConfig().map(f => f.name);
      expect(names).toContain('template');
    });
  });

  describe('handleFormResult', () => {
    it('does not call sendCaseEmail when recipients is empty', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: '' });
      expect(apiSpy.sendCaseEmail).not.toHaveBeenCalled();
    });

    it('does not call sendCaseEmail when invalid email', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: 'not-an-email' });
      expect(apiSpy.sendCaseEmail).not.toHaveBeenCalled();
    });

    it('calls sendCaseEmail when digital format with valid recipient', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: 'a@b.com', handlingFormat: 'digital' });
      expect(apiSpy.sendCaseEmail).toHaveBeenCalledWith(
        'handling-1',
        jasmine.objectContaining({
          recipients: ['a@b.com'],
        })
      );
    });

    it('skips sendCaseEmail when format is paper', () => {
      apiSpy.sendCaseEmail.calls.reset();
      component.handleFormResult({ recipients: 'a@b.com', handlingFormat: 'paper' });
      expect(apiSpy.sendCaseEmail).not.toHaveBeenCalled();
    });

    it('calls editDocument regardless of format', () => {
      apiSpy.editDocument.calls.reset();
      component.handleFormResult({ recipients: 'a@b.com', handlingFormat: 'digital' });
      expect(apiSpy.editDocument).toHaveBeenCalled();
    });

    it('emits emailSent and closeDialog on success', () => {
      let sent = false;
      let closed = false;
      component.emailSent.subscribe(() => (sent = true));
      component.closeDialog.subscribe(() => (closed = true));
      component.handleFormResult({ recipients: 'a@b.com', handlingFormat: 'digital' });
      expect(sent).toBeTrue();
      expect(closed).toBeTrue();
    });

    it('emits events on paper format success (no email sent)', () => {
      let sent = false;
      let closed = false;
      component.emailSent.subscribe(() => (sent = true));
      component.closeDialog.subscribe(() => (closed = true));
      component.handleFormResult({ recipients: 'a@b.com', handlingFormat: 'paper' });
      expect(sent).toBeTrue();
      expect(closed).toBeTrue();
    });
  });

  describe('templateOptions', () => {
    it('populates from getMailTemplates response', () => {
      apiSpy.getMailTemplates.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'tmpl-1', title: 'Expediera handling' })] }))
      );
      component.ngOnInit();
      expect(component.templateOptions().length).toBe(1);
    });

    it('sets defaultTemplate to matching Expediera handling entry', () => {
      apiSpy.getMailTemplates.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeNuxeoDocument({ uid: 'tmpl-1', title: 'Expediera handling' }),
              makeNuxeoDocument({ uid: 'tmpl-2', title: 'Other Template' }),
            ],
          })
        )
      );
      component.ngOnInit();
      expect(component.defaultTemplate().length).toBe(1);
      expect(component.defaultTemplate()[0].label).toBe('Expediera handling');
    });
  });
});
