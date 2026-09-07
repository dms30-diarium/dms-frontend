import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { WorkflowComponent } from './workflow.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { UserService } from '@app/core/services/users.service';
import { AuthService } from '@app/core/services/auth.service';
import { UserSuggestion } from '@app/core/services/users.service';
import { makeWorkflowInfo } from '@app/shared/testing/mock-factories';

const workflowInfo = makeWorkflowInfo({ id: 'wf-1', name: 'Workflow', state: 'running' });
const alice: UserSuggestion = {
  id: 'u1',
  username: 'u1',
  displayLabel: 'Alice',
  email: 'alice@example.com',
  company: 'Org',
  type: 'USER_TYPE',
  prefixed_id: 'user:u1',
};

describe('WorkflowComponent', () => {
  let component: WorkflowComponent;
  let fixture: ComponentFixture<WorkflowComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let userSpy: jasmine.SpyObj<UserService>;
  let authSpy: { username: ReturnType<typeof signal<string>> };

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'editWorkflow', 'deleteWorkflow']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.editWorkflow.and.returnValue(of(workflowInfo));
    apiSpy.deleteWorkflow.and.returnValue(of([]));

    userSpy = jasmine.createSpyObj('UserService', ['getcoworkers']);
    userSpy.getcoworkers.and.returnValue(of([]));

    authSpy = { username: signal<string>('testUser') };

    await TestBed.configureTestingModule({
      imports: [WorkflowComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: UserService, useValue: userSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    })
      .overrideTemplate(WorkflowComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(WorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial signal state', () => {
    it('editWorkflowDialog defaults false', () => {
      expect(component.editWorkflowDialog()).toBeFalse();
    });

    it('isDelegateDialogOpen defaults false', () => {
      expect(component.isDelegateDialogOpen()).toBeFalse();
    });

    it('isReassignDialogOpen defaults false', () => {
      expect(component.isReassignDialogOpen()).toBeFalse();
    });

    it('userSuggestion defaults null', () => {
      expect(component.userSuggestion()).toBeNull();
    });

    it('taskId defaults empty string', () => {
      expect(component.taskId()).toBe('');
    });

    it('canEditOrDelete defaults false when no tasks/workflow', () => {
      expect(component.canEditOrDelete()).toBeFalse();
    });
  });

  describe('constructor effect', () => {
    it('sets taskId when matching task found', () => {
      fixture.componentRef.setInput('workFlow', { id: 'wf-1' });
      fixture.componentRef.setInput('tasks', [{ id: 'task-1', workflowInstanceId: 'wf-1' }]);
      fixture.detectChanges();
      expect(component.taskId()).toBe('task-1');
    });

    it('sets canEditOrDelete true when matching task found', () => {
      fixture.componentRef.setInput('workFlow', { id: 'wf-2' });
      fixture.componentRef.setInput('tasks', [{ id: 't2', workflowInstanceId: 'wf-2' }]);
      fixture.detectChanges();
      expect(component.canEditOrDelete()).toBeTrue();
    });

    it('leaves taskId empty when no matching task', () => {
      fixture.componentRef.setInput('workFlow', { id: 'wf-3' });
      fixture.componentRef.setInput('tasks', [{ id: 't3', workflowInstanceId: 'other-wf' }]);
      fixture.detectChanges();
      expect(component.taskId()).toBe('');
    });
  });

  describe('getWorkflowDetails', () => {
    it('opens editWorkflowDialog', () => {
      component.getWorkflowDetails();
      expect(component.editWorkflowDialog()).toBeTrue();
    });
  });

  describe('openDelegateDialog', () => {
    it('opens isDelegateDialogOpen', () => {
      component.openDelegateDialog();
      expect(component.isDelegateDialogOpen()).toBeTrue();
    });

    it('fetches coworkers if userSuggestion is null', () => {
      userSpy.getcoworkers.and.returnValue(of([alice]));
      component.openDelegateDialog();
      expect(userSpy.getcoworkers).toHaveBeenCalled();
    });

    it('does not fetch coworkers again if already loaded', () => {
      component.userSuggestion.set([{ id: 'u1', label: 'Alice' }]);
      userSpy.getcoworkers.calls.reset();
      component.openDelegateDialog();
      expect(userSpy.getcoworkers).not.toHaveBeenCalled();
    });
  });

  describe('openReassignDialog', () => {
    it('opens isReassignDialogOpen', () => {
      component.openReassignDialog();
      expect(component.isReassignDialogOpen()).toBeTrue();
    });
  });

  describe('onDelegate', () => {
    it('does nothing when no delegatedUser selected', () => {
      component.formDelegate.get('delegatedUser')!.setValue([]);
      component.onDelegate();
      expect(apiSpy.editWorkflow).not.toHaveBeenCalled();
    });

    it('calls editWorkflow with delegate action', () => {
      fixture.componentRef.setInput('workFlow', { id: 'wf-d' });
      fixture.componentRef.setInput('tasks', [{ id: 'tid', workflowInstanceId: 'wf-d' }]);
      fixture.detectChanges();
      component.formDelegate.get('delegatedUser')!.setValue([{ id: 'user-1', label: 'Bob' }]);
      component.formDelegate.get('comment')!.setValue('note');
      component.onDelegate();
      expect(apiSpy.editWorkflow).toHaveBeenCalledWith(
        'tid',
        'delegate',
        jasmine.objectContaining({
          params: jasmine.objectContaining({ delegatedActors: 'user-1', comment: 'note' }),
        })
      );
    });
  });

  describe('onReassign', () => {
    it('does nothing when no reassignedUser selected', () => {
      component.formReassign.get('reassignedUser')!.setValue([]);
      component.onReassign();
      expect(apiSpy.editWorkflow).not.toHaveBeenCalled();
    });

    it('calls editWorkflow with reassign action', () => {
      fixture.componentRef.setInput('workFlow', { id: 'wf-r' });
      fixture.componentRef.setInput('tasks', [{ id: 'tr', workflowInstanceId: 'wf-r' }]);
      fixture.detectChanges();
      component.formReassign.get('reassignedUser')!.setValue([{ id: 'user-2', label: 'Carl' }]);
      component.onReassign();
      expect(apiSpy.editWorkflow).toHaveBeenCalledWith(
        'tr',
        'reassign',
        jasmine.objectContaining({
          params: jasmine.objectContaining({ actors: 'user-2' }),
        })
      );
    });
  });

  describe('deleteWorkflow', () => {
    it('does nothing when no workflow input', () => {
      component.deleteWorkflow();
      expect(apiSpy.deleteWorkflow).not.toHaveBeenCalled();
    });

    it('calls deleteWorkflow api with workflow id', () => {
      fixture.componentRef.setInput('workFlow', { id: 'wf-del' });
      fixture.detectChanges();
      component.deleteWorkflow();
      expect(apiSpy.deleteWorkflow).toHaveBeenCalledWith('wf-del');
    });
  });
});
