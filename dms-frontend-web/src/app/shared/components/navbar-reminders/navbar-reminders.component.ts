import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CasesService } from '@app/core/services/cases.service';
import { WorkflowInfo } from '@app/shared/api/nuxeo-api.types';
import { DigiBadgeNotification, DigiButton, DigiHeaderNotification, DigiIconBell } from '@designsystem-se/af-angular';

interface NavbarWorkflowNotificationItem {
  kind: 'workflow';
  id: string;
  type: 'Påminnelse' | 'Deadline';
  workflowType: string;
  title: string;
  deadlineDate: string;
  targetDocumentId: string;
}

interface NavbarMessageNotificationItem {
  kind: 'message';
  id: string;
  title: string;
  fileType: string;
  message: string;
  targetDocumentId: string;
}

type NavbarNotificationItem = NavbarWorkflowNotificationItem | NavbarMessageNotificationItem;

@Component({
  selector: 'nuxeo-navbar-reminders',
  standalone: true,
  templateUrl: './navbar-reminders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DigiBadgeNotification, DigiButton, DigiHeaderNotification, DigiIconBell],
})
export class NavbarRemindersComponent implements OnInit {
  isReminderPopupOpen = signal(false);
  readonly todayReminderItems = signal<NavbarWorkflowNotificationItem[]>([]);
  readonly messageNotificationItems = signal<NavbarMessageNotificationItem[]>([]);
  readonly notificationItems = computed<NavbarNotificationItem[]>(() => [
    ...this.todayReminderItems(),
    ...this.messageNotificationItems(),
  ]);
  readonly reminderCount = computed(() => `${this.notificationItems().length}`);
  readonly reminderBadgeLabel = computed(() => `${this.reminderCount()} påminnelser idag`);

  private casesService = inject(CasesService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadTodayReminderItems();
  }

  toggleReminderPopup(): void {
    this.isReminderPopupOpen.update(isOpen => !isOpen);
  }

  openReminderDocument(uid: string): void {
    this.isReminderPopupOpen.set(false);
    this.router.navigate(['/doc/', uid]);
  }

  private loadTodayReminderItems(): void {
    const today = new Date();

    this.casesService.getAllTasks(200, 0).subscribe(response => {
      this.todayReminderItems.set(response.entries.flatMap(task => this.mapTodayReminderItems(task, today)));
    });
  }

  private mapTodayReminderItems(task: WorkflowInfo, today: Date): NavbarWorkflowNotificationItem[] {
    if (task.workflowModelName === 'DeadlineOchPaminnelse') {
      return this.mapWorkflowDateItems(
        task,
        new Date(task.variables.paminnelse),
        new Date(task.variables.deadline),
        today
      );
    }

    if (task.workflowModelName === 'AllmantArbetsflode') {
      return this.mapAllmantArbetsflodeItems(task, today);
    }

    return [];
  }

  private mapAllmantArbetsflodeItems(task: WorkflowInfo, today: Date): NavbarWorkflowNotificationItem[] {
    if (!task.variables.paminnelseDatum || !task.variables.forfalloDatum || !task.variables.valdAtgard) {
      return [];
    }

    const reminderDate = new Date(task.variables.paminnelseDatum);
    const deadlineDate = new Date(task.variables.forfalloDatum);

    if (this.isSameDay(reminderDate, deadlineDate)) {
      return this.mapSingleWorkflowDateItem(task, 'Deadline', deadlineDate, deadlineDate, today);
    }

    return this.mapWorkflowDateItems(task, reminderDate, deadlineDate, today);
  }

  private mapSingleWorkflowDateItem(
    task: WorkflowInfo,
    type: 'Påminnelse' | 'Deadline',
    date: Date,
    deadlineDate: Date,
    today: Date
  ): NavbarWorkflowNotificationItem[] {
    if (!this.isSameDay(date, today)) {
      return [];
    }

    return [this.createReminderItem(task, type, deadlineDate)];
  }

  private mapWorkflowDateItems(
    task: WorkflowInfo,
    reminderDate: Date,
    deadlineDate: Date,
    today: Date
  ): NavbarWorkflowNotificationItem[] {
    return (
      [
        {
          id: `${task.id}-paminnelse`,
          type: 'Påminnelse',
          title: task.targetDocumentIds[0].title,
          date: reminderDate,
          targetDocumentId: task.targetDocumentIds[0].uid,
        },
        {
          id: `${task.id}-deadline`,
          type: 'Deadline',
          title: task.targetDocumentIds[0].title,
          date: deadlineDate,
          targetDocumentId: task.targetDocumentIds[0].uid,
        },
      ] as const
    )
      .filter(item => this.isSameDay(item.date, today))
      .map(item => this.createReminderItem(task, item.type, deadlineDate, item.id));
  }

  private createReminderItem(
    task: WorkflowInfo,
    type: 'Påminnelse' | 'Deadline',
    deadlineDate: Date,
    id = task.id
  ): NavbarWorkflowNotificationItem {
    const reminderItem: NavbarWorkflowNotificationItem = {
      kind: 'workflow',
      id,
      type,
      workflowType: this.getWorkflowTypeLabel(task),
      title: task.targetDocumentIds[0].title,
      deadlineDate: this.formatReminderDate(deadlineDate),
      targetDocumentId: task.targetDocumentIds[0].uid,
    };

    return reminderItem;
  }

  private getWorkflowTypeLabel(task: WorkflowInfo): string {
    if (task.workflowModelName === 'AllmantArbetsflode') {
      if (!task.variables.valdAtgard) {
        return task.workflowTitle;
      }

      return `${task.variables.valdAtgard.properties.label} (${task.workflowTitle})`;
    }

    return task.workflowTitle;
  }

  private isSameDay(left: Date, right: Date): boolean {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  private formatReminderDate(date: Date): string {
    return date.toLocaleDateString('sv-SE');
  }
}
