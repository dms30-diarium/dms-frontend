import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ConsultColleagueFormComponent } from './consult-colleague-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

const sharedDoc: NuxeoDocument = makeNuxeoDocument({ uid: 'doc-1', type: 'File', title: 'Doc', properties: {} });

describe('ConsultColleagueFormComponent', () => {
  let component: ConsultColleagueFormComponent;
  let fixture: ComponentFixture<ConsultColleagueFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'shareDocumentWithExternalUser']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.shareDocumentWithExternalUser.and.returnValue(of(sharedDoc));

    await TestBed.configureTestingModule({
      imports: [ConsultColleagueFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(ConsultColleagueFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ConsultColleagueFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('documentId', 'doc-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signals initial state', () => {
    it('isSubmitting defaults to false', () => {
      expect(component.isSubmitting()).toBeFalse();
    });

    it('consultFormConfig has 5 fields', () => {
      expect(component.consultFormConfig().length).toBe(5);
    });

    it('email field has required and email validators', () => {
      const emailField = component.consultFormConfig().find(f => f.name === 'email');
      expect(emailField?.validators?.length).toBeGreaterThan(0);
    });

    it('right field defaults to Read', () => {
      const rightField = component.consultFormConfig().find(f => f.name === 'right');
      expect(rightField?.defaultValue).toBe('Read');
    });

    it('right field has 3 permission options', () => {
      const rightField = component.consultFormConfig().find(f => f.name === 'right');
      expect(rightField?.options?.length).toBe(3);
    });
  });

  describe('handleFormResult', () => {
    it('shows error when email is missing', () => {
      apiSpy.shareDocumentWithExternalUser.calls.reset();
      component.handleFormResult({ to: '2024-12-31' });
      expect(apiSpy.shareDocumentWithExternalUser).not.toHaveBeenCalled();
    });

    it('shows error when end date is missing', () => {
      apiSpy.shareDocumentWithExternalUser.calls.reset();
      component.handleFormResult({ email: 'user@test.com' });
      expect(apiSpy.shareDocumentWithExternalUser).not.toHaveBeenCalled();
    });

    it('calls shareDocumentWithExternalUser with valid inputs', () => {
      apiSpy.shareDocumentWithExternalUser.calls.reset();
      component.handleFormResult({
        email: 'user@test.com',
        right: 'Read',
        to: '2024-12-31',
        notificationEmail: 'Hi!',
      });
      expect(apiSpy.shareDocumentWithExternalUser).toHaveBeenCalledWith(
        'doc-1',
        jasmine.objectContaining({
          email: 'user@test.com',
          permission: 'Read',
          notify: true,
        })
      );
    });

    it('emits formSubmitted on success', () => {
      let emitted: Record<string, unknown> | undefined;
      component.formSubmitted.subscribe(v => (emitted = v));
      component.handleFormResult({ email: 'u@t.com', to: '2024-12-31' });
      expect(emitted).toBeTruthy();
    });

    it('emits closeDialog on success', () => {
      let closed = false;
      component.closeDialog.subscribe(() => (closed = true));
      component.handleFormResult({ email: 'u@t.com', to: '2024-12-31' });
      expect(closed).toBeTrue();
    });

    it('sets isSubmitting to false after success', () => {
      component.handleFormResult({ email: 'u@t.com', to: '2024-12-31' });
      expect(component.isSubmitting()).toBeFalse();
    });

    it('handles right permission value', () => {
      apiSpy.shareDocumentWithExternalUser.calls.reset();
      component.handleFormResult({
        email: 'u@t.com',
        right: 'ReadWrite',
        to: '2024-12-31',
      });
      expect(apiSpy.shareDocumentWithExternalUser).toHaveBeenCalledWith(
        'doc-1',
        jasmine.objectContaining({
          permission: 'ReadWrite',
        })
      );
    });

    it('defaults permission to Read when right is missing', () => {
      apiSpy.shareDocumentWithExternalUser.calls.reset();
      component.handleFormResult({ email: 'u@t.com', to: '2024-12-31' });
      expect(apiSpy.shareDocumentWithExternalUser).toHaveBeenCalledWith(
        'doc-1',
        jasmine.objectContaining({
          permission: 'Read',
        })
      );
    });

    it('passes null begin when no from date', () => {
      apiSpy.shareDocumentWithExternalUser.calls.reset();
      component.handleFormResult({ email: 'u@t.com', to: '2024-12-31' });
      expect(apiSpy.shareDocumentWithExternalUser).toHaveBeenCalledWith(
        'doc-1',
        jasmine.objectContaining({
          begin: null,
        })
      );
    });
  });
});
