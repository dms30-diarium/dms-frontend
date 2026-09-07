import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { UtkastDialogComponent } from './utkast-dialog.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { UserService } from '@app/core/services/users.service';
import { AuthService } from '@app/core/services/auth.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { UserSuggestion } from '@app/core/services/users.service';

const updatedDoc: NuxeoDocument = { uid: 'doc-1', title: 'Doc', type: 'File', properties: {} } as NuxeoDocument;
const alice: UserSuggestion = {
  id: 'u1',
  username: 'u1',
  displayLabel: 'Alice',
  email: 'alice@example.com',
  company: 'Org',
  type: 'USER_TYPE',
  prefixed_id: 'user:u1',
};
const bob: UserSuggestion = {
  id: 'u2',
  username: 'u2',
  displayLabel: 'Bob',
  email: 'bob@example.com',
  company: 'Org',
  type: 'USER_TYPE',
  prefixed_id: 'user:u2',
};

describe('UtkastDialogComponent', () => {
  let component: UtkastDialogComponent;
  let fixture: ComponentFixture<UtkastDialogComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let userSpy: jasmine.SpyObj<UserService>;
  let authSpy: { username: ReturnType<typeof signal<string>> };

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'setResponsibleManager',
      'updateResponsibleManager',
      'updateRequester',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.setResponsibleManager.and.returnValue(of(updatedDoc));
    apiSpy.updateResponsibleManager.and.returnValue(of(updatedDoc));
    apiSpy.updateRequester.and.returnValue(of(updatedDoc));

    userSpy = jasmine.createSpyObj('UserService', ['getcoworkers']);
    userSpy.getcoworkers.and.returnValue(of([alice, bob]));

    authSpy = { username: signal<string>('logged-in-user') };

    await TestBed.configureTestingModule({
      imports: [UtkastDialogComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: UserService, useValue: userSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    })
      .overrideTemplate(UtkastDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(UtkastDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('docId', 'doc-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads coworker options', () => {
      expect(component.coworkerOptions().length).toBe(2);
    });

    it('maps displayLabel to label', () => {
      expect(component.coworkerOptions()[0].label).toBe('Alice');
    });
  });

  describe('signals initial state', () => {
    it('confirmStep defaults false', () => {
      expect(component.confirmStep()).toBeFalse();
    });

    it('mode defaults to approval', () => {
      expect(component.mode()).toBe('approval');
    });
  });

  describe('onAssignUser', () => {
    it('does nothing when no coworker selected', () => {
      component.form.get('coworker')!.setValue([]);
      component.onAssignUser();
      expect(apiSpy.setResponsibleManager).not.toHaveBeenCalled();
    });

    it('calls setResponsibleManager for approval mode', () => {
      component.form.get('coworker')!.setValue([{ id: 'u1' }]);
      component.onAssignUser();
      expect(apiSpy.setResponsibleManager).toHaveBeenCalledWith('doc-1', 'u1', jasmine.anything());
    });

    it('uses auth.username as previousAssignee when no currentAssignee', () => {
      component.form.get('coworker')!.setValue([{ id: 'u1' }]);
      component.onAssignUser();
      expect(apiSpy.setResponsibleManager).toHaveBeenCalledWith('doc-1', 'u1', 'logged-in-user');
    });

    it('uses currentAssignee as previousAssignee when provided', () => {
      fixture.componentRef.setInput('currentAssignee', 'prev-user');
      component.form.get('coworker')!.setValue([{ id: 'u1' }]);
      component.onAssignUser();
      expect(apiSpy.setResponsibleManager).toHaveBeenCalledWith('doc-1', 'u1', 'prev-user');
    });

    it('sets confirmStep for reassign mode on first call', () => {
      fixture.componentRef.setInput('mode', 'reassign');
      component.form.get('coworker')!.setValue([{ id: 'u1' }]);
      component.onAssignUser();
      expect(component.confirmStep()).toBeTrue();
      expect(apiSpy.updateResponsibleManager).not.toHaveBeenCalled();
    });

    it('calls updateResponsibleManager for reassign after confirmStep', () => {
      fixture.componentRef.setInput('mode', 'reassign');
      component.form.get('coworker')!.setValue([{ id: 'u1' }]);
      component.confirmStep.set(true);
      component.onAssignUser();
      expect(apiSpy.updateResponsibleManager).toHaveBeenCalledWith('doc-1', 'u1');
    });

    it('calls updateRequester for changeRequester mode after confirmStep', () => {
      fixture.componentRef.setInput('mode', 'changeRequester');
      component.form.get('coworker')!.setValue([{ id: 'u2' }]);
      component.confirmStep.set(true);
      component.onAssignUser();
      expect(apiSpy.updateRequester).toHaveBeenCalledWith('doc-1', 'u2');
    });
  });

  describe('onCancel', () => {
    it('resets confirmStep', () => {
      component.confirmStep.set(true);
      component.onCancel();
      expect(component.confirmStep()).toBeFalse();
    });

    it('emits closeDialog', () => {
      let emitted = false;
      component.closeDialog.subscribe(() => (emitted = true));
      component.onCancel();
      expect(emitted).toBeTrue();
    });
  });
});
