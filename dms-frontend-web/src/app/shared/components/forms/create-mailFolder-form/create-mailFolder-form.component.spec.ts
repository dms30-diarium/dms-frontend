import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateMailFolderComponent } from './create-mailFolder-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'MailFolder', title: '', properties: {} });
const MOCK_DOC = makeNuxeoDocument({ uid: 'mf-1', type: 'MailFolder', title: 'MF', properties: {} });

describe('CreateMailFolderComponent', () => {
  let component: CreateMailFolderComponent;
  let fixture: ComponentFixture<CreateMailFolderComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getEmptyWithDefaults', 'createDocument']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(MOCK_DOC));

    await TestBed.configureTestingModule({
      imports: [CreateMailFolderComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateMailFolderComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateMailFolderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parentUid', 'parent-1');
    fixture.componentRef.setInput('path', '/domain/mail');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for MailFolder', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/mail', 'MailFolder');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(MOCK_PAYLOAD);
    });
  });

  describe('signals initial state', () => {
    it('createFolderConfig has 3 fields', () => {
      expect(component.createFolderConfig().length).toBe(3);
    });

    it('includes name, email, password fields', () => {
      const names = component.createFolderConfig().map(f => f.name);
      expect(names).toContain('name');
      expect(names).toContain('email');
      expect(names).toContain('password');
    });

    it('password field is password type', () => {
      const pwField = component.createFolderConfig().find(f => f.name === 'password');
      expect(pwField?.inputType).toBe('password');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload = null;
      expect(() => component.createDocument({ name: 'N', email: 'e@t.com', password: 'pw' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'InboxFolder', email: 'user@gmail.com', password: 'secret' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'InboxFolder' }),
        '/domain/mail'
      );
    });

    it('sets default IMAP settings in properties', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'N', email: 'u@g.com', password: 'pw' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      const properties = payload.properties as Record<string, unknown>;
      const hostKey = Object.keys(properties).find(k => k.includes('host'));
      expect(properties[hostKey!]).toBe('imap.gmail.com');
    });

    it('sets emailsLimit to 100', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ name: 'N', email: 'u@g.com', password: 'pw' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      const properties = payload.properties as Record<string, unknown>;
      const limitKey = Object.keys(properties).find(k => k.includes('emailsLimit') || k.includes('emails_limit'));
      expect(properties[limitKey!]).toBe(100);
    });

    it('emits dialogClosed on success', () => {
      let emitted: NuxeoDocument | null | undefined;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ name: 'N', email: 'u@g.com', password: 'pw' });
      expect(emitted).toBeTruthy();
    });
  });
});
