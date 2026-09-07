import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { WorkflowInfo } from '@app/shared/api/nuxeo-api.types';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { DatePipe } from '@angular/common';
import { UserService } from '@app/core/services/users.service';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, EMPTY, tap } from 'rxjs';
import { GeneralStore } from '@app/core/services/general-store.service';
import { AuthService } from '@app/core/services/auth.service';
import { Option } from '@app/shared/commonTypes';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';
import {
  WORKFLOW_EDIT_ERROR_MESSAGE,
  WORKFLOW_EDIT_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

@Component({
  selector: 'nuxeo-workflow',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow.component.html',
})
export class WorkflowComponent {
  readonly getUserFullName = formatUserFullName;
  tasks = input<WorkflowInfo[]>();
  workFlow = input<WorkflowInfo>();
  update = output();
  readonly apiService = inject(NuxeoApiService);
  readonly auth = inject(AuthService);
  private readonly store = inject(GeneralStore);
  readonly userService = inject(UserService);
  editWorkflowDialog = signal<boolean>(false);
  isDelegateDialogOpen = signal<boolean>(false);
  isReassignDialogOpen = signal<boolean>(false);
  userSuggestion = signal<Option[] | null>(null);
  taskId = signal<string>('');
  canEditOrDelete = signal<boolean>(false);

  formDelegate = new FormGroup({
    delegatedUser: new FormControl<Option[]>([]),
    comment: new FormControl(''),
  });

  formReassign = new FormGroup({
    reassignedUser: new FormControl<Option[]>([]),
    comment: new FormControl(''),
  });

  constructor() {
    effect(() => {
      const task = this.tasks()?.find(el => el.workflowInstanceId === this.workFlow()?.id);
      this.taskId.set(task?.id ?? '');
      this.canEditOrDelete.set(!!task);
    });
  }

  getWorkflowDetails() {
    this.editWorkflowDialog.set(true);
  }

  openDelegateDialog() {
    this.isDelegateDialogOpen.set(true);
    if (!this.userSuggestion()) {
      this.userService.getcoworkers().subscribe(data => {
        this.userSuggestion.set(data.map(el => ({ id: el.id, label: el.displayLabel })));
      });
    }
  }
  openReassignDialog() {
    this.isReassignDialogOpen.set(true);
    if (!this.userSuggestion()) {
      this.userService
        .getcoworkers()
        .subscribe(data => this.userSuggestion.set(data.map(el => ({ id: el.id, label: el.displayLabel }))));
    }
  }
  onDelegate() {
    const comment = this.formDelegate.get('comment')?.value ?? '';
    const delegatedUser = this.formDelegate.get('delegatedUser')?.value?.[0]?.id;

    if (!delegatedUser) return;
    this.editWorkflow('delegate', comment, delegatedUser);
  }
  onReassign() {
    const comment = this.formReassign.get('comment')?.value ?? '';
    const reassignedUser = this.formReassign.get('reassignedUser')?.value?.[0]?.id;
    if (!reassignedUser) return;
    this.editWorkflow('reassign', comment, reassignedUser);
  }

  editWorkflow(action: 'reassign' | 'delegate', comment: string, actor: string) {
    const taskId = this.taskId();
    if (!taskId || !actor) {
      return;
    }
    const payload = {
      params: { comment, [action === 'delegate' ? 'delegatedActors' : 'actors']: actor },
    };
    this.apiService
      .editWorkflow(taskId, action, payload)
      .pipe(
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: WORKFLOW_EDIT_SUCCESS_MESSAGE,
          });
          this.update.emit();
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: WORKFLOW_EDIT_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  deleteWorkflow() {
    const workflow = this.workFlow()?.id;

    if (!workflow) {
      return;
    }
    this.apiService.deleteWorkflow(workflow).subscribe(() => this.update.emit());
  }
}
