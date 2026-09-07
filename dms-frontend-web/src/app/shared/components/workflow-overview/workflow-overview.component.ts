import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WorkflowComponent } from '../workflow/workflow.component';
import { CommonModule } from '@angular/common';
import { WorkflowInfo } from '@app/shared/api/nuxeo-api.types';

// Shape for deadline comment groups passed from case page
interface DeadlineComment {
  date?: Date | string | null;
  description?: string | null;
  comments?: { kommentar?: string | null; atgardDatum?: string | Date | null }[] | null;
}

@Component({
  selector: 'nuxeo-workflow-overview',
  imports: [WorkflowComponent, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow-overview.component.html',
})
export class WorkflowOverviewComponent {
  reminders = input<Date[] | undefined>();
  deadlines = input<Date[] | undefined>();
  runningWorkflows = input<WorkflowInfo[] | null>(null);
  deadlineCommentGroups = input<DeadlineComment[] | undefined>();
  pendingTasks = input<WorkflowInfo[] | undefined>(undefined);
  reloadDocument = output();
}
