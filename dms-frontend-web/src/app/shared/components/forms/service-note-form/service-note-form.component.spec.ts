import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ServiceNoteFormComponent } from './service-note-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuthService } from '@app/core/services/auth.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { makeNuxeoDocument, makeNxUser } from '@app/shared/testing/mock-factories';
import { NxUser } from '@app/shared/api/nuxeo-api.types';

function makeAuthMock(overrides: { fullName?: string; username?: string; user?: NxUser } = {}) {
  const fullNameSig = signal(overrides.fullName ?? 'Anna Andersson');
  const usernameSig = signal(overrides.username ?? 'anna.andersson');
  const userSig = signal(overrides.user ?? makeNxUser({ id: 'anna.andersson' }));
  return {
    fullName: computed(() => fullNameSig()),
    username: computed(() => usernameSig()),
    user: computed(() => userSig()),
    loadMe: jasmine.createSpy(),
  };
}

function makeArendeDoc(overrides: Record<string, unknown> = {}) {
  return makeNuxeoDocument({
    uid: 'case-1',
    type: 'Arende',
    title: 'Test Case',
    properties: {
      [NUXEO_SCHEMA_FIELDS.arende.kontakter]: [],
      [NUXEO_SCHEMA_FIELDS.arende.adress]: null,
      [NUXEO_SCHEMA_FIELDS.arende.besoksadress]: null,
      ...overrides,
    },
  });
}

describe('ServiceNoteFormComponent', () => {
  let component: ServiceNoteFormComponent;
  let fixture: ComponentFixture<ServiceNoteFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let authMock: ReturnType<typeof makeAuthMock>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'createHandlingFromNote']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.createHandlingFromNote.and.returnValue(of(makeNuxeoDocument({ uid: 'new-note', type: 'Handling' })));

    authMock = makeAuthMock();

    await TestBed.configureTestingModule({
      imports: [ServiceNoteFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authMock },
      ],
    })
      .overrideTemplate(ServiceNoteFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ServiceNoteFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('casePath', '/domain/cases');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('populates userFullName from auth.fullName', () => {
      expect(component.userFullName()).toBe('Anna Andersson');
    });

    it('populates userInitials from full name', () => {
      expect(component.userInitials()).toBe('AA');
    });

    it('userCompany is null when user has no company property', () => {
      expect(component.userCompany()).toBeNull();
    });
  });

  describe('signals initial state', () => {
    it('isSubmitting defaults to false', () => {
      expect(component.isSubmitting()).toBeFalse();
    });

    it('noteControl default value is empty string', () => {
      expect(component.noteControl.value).toBe('');
    });
  });

  describe('computed signals', () => {
    it('caseDocumentTitle defaults to empty when no caseDocument', () => {
      expect(component.caseDocumentTitle()).toBe('');
    });

    it('caseDocumentTitle returns doc title when set', () => {
      fixture.componentRef.setInput('caseDocument', makeArendeDoc());
      fixture.detectChanges();
      expect(component.caseDocumentTitle()).toBe('Test Case');
    });

    it('footerAddress returns empty when no doc', () => {
      expect(component.footerAddress()).toBe('');
    });

    it('footerAddress returns direct address when set', () => {
      fixture.componentRef.setInput(
        'caseDocument',
        makeArendeDoc({
          [NUXEO_SCHEMA_FIELDS.arende.adress]: 'Storgatan 1',
        })
      );
      fixture.detectChanges();
      expect(component.footerAddress()).toBe('Storgatan 1');
    });

    it('contactEmail returns empty when no contacts', () => {
      expect(component.contactEmail()).toBe('');
    });

    it('contactEmail extracts email from first contact with email', () => {
      fixture.componentRef.setInput(
        'caseDocument',
        makeArendeDoc({
          [NUXEO_SCHEMA_FIELDS.arende.kontakter]: [{ epost: 'contact@example.com', namn: 'Contact' }],
        })
      );
      fixture.detectChanges();
      expect(component.contactEmail()).toBe('contact@example.com');
    });

    it('contactPhone returns empty when no contacts', () => {
      expect(component.contactPhone()).toBe('');
    });
  });

  describe('isNoteEmpty', () => {
    it('returns true when noteControl is empty', () => {
      component.noteControl.setValue('');
      expect(component.isNoteEmpty()).toBeTrue();
    });

    it('returns true when noteControl has only HTML tags', () => {
      component.noteControl.setValue('<p></p>');
      expect(component.isNoteEmpty()).toBeTrue();
    });

    it('returns false when noteControl has text content', () => {
      component.noteControl.setValue('<p>Some text</p>');
      expect(component.isNoteEmpty()).toBeFalse();
    });

    it('returns false for plain text', () => {
      component.noteControl.setValue('Plain text note');
      expect(component.isNoteEmpty()).toBeFalse();
    });
  });

  describe('onCancel', () => {
    it('resets noteControl', () => {
      component.noteControl.setValue('some note');
      component.onCancel();
      expect(component.noteControl.value).toBe('');
    });

    it('emits closeDialog', () => {
      let emitted = false;
      component.closeDialog.subscribe(() => (emitted = true));
      component.onCancel();
      expect(emitted).toBeTrue();
    });
  });

  describe('onCreateHandling', () => {
    it('does not call API when note is empty', () => {
      component.noteControl.setValue('');
      component.onCreateHandling();
      expect(apiSpy.createHandlingFromNote).not.toHaveBeenCalled();
    });

    it('does not call API when note has only HTML', () => {
      component.noteControl.setValue('<p><br></p>');
      component.onCreateHandling();
      expect(apiSpy.createHandlingFromNote).not.toHaveBeenCalled();
    });

    it('shows error notification when no caseDocument uid', () => {
      component.noteControl.setValue('Some note text');
      fixture.componentRef.setInput('caseDocument', null);
      fixture.detectChanges();
      component.onCreateHandling();
      expect(apiSpy.createHandlingFromNote).not.toHaveBeenCalled();
    });

    it('calls createHandlingFromNote with valid note and caseDocument', () => {
      fixture.componentRef.setInput('caseDocument', makeArendeDoc());
      fixture.detectChanges();
      component.noteControl.setValue('This is a real note');
      component.onCreateHandling();
      expect(apiSpy.createHandlingFromNote).toHaveBeenCalledWith(
        jasmine.objectContaining({
          input: 'case-1',
          params: jasmine.objectContaining({
            anteckning: 'This is a real note',
          }),
        })
      );
    });

    it('emits handlingCreated on success', () => {
      fixture.componentRef.setInput('caseDocument', makeArendeDoc());
      fixture.detectChanges();
      component.noteControl.setValue('Note text');
      let emitted: unknown;
      component.handlingCreated.subscribe(v => (emitted = v));
      component.onCreateHandling();
      expect(emitted).toBeTruthy();
    });

    it('emits closeDialog on success', () => {
      fixture.componentRef.setInput('caseDocument', makeArendeDoc());
      fixture.detectChanges();
      component.noteControl.setValue('Note text');
      let closed = false;
      component.closeDialog.subscribe(() => (closed = true));
      component.onCreateHandling();
      expect(closed).toBeTrue();
    });

    it('resets noteControl after success', () => {
      fixture.componentRef.setInput('caseDocument', makeArendeDoc());
      fixture.detectChanges();
      component.noteControl.setValue('Note text');
      component.onCreateHandling();
      expect(component.noteControl.value).toBe('');
    });
  });

  describe('editorConfig', () => {
    it('is editable', () => {
      expect(component.editorConfig.editable).toBeTrue();
    });

    it('has minHeight', () => {
      expect(component.editorConfig.minHeight).toBe('200px');
    });
  });

  describe('userInitials edge cases', () => {
    it('returns two initials from two-word name', () => {
      expect(component.userInitials()).toBe('AA');
    });

    it('userLogoUrl defaults to null when no avatar or company logo in user properties', () => {
      expect(component.userLogoUrl()).toBeNull();
    });
  });
});
