import { ChangeDetectionStrategy, Component, input, OnDestroy, OnInit, output } from '@angular/core';
import { DigiNotificationAlert } from '@designsystem-se/af-angular';

export interface NotificationType {
  show: boolean;
  variation?: 'info' | 'danger' | 'warning' | 'success';
  text?: string;
  belowTopPanel?: boolean;
}
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-notification',
  imports: [DigiNotificationAlert],
  templateUrl: './notification.component.html',
})
export class NotificationComponent implements OnInit, OnDestroy {
  size = input<'small' | 'medium' | 'large'>();
  variation = input<'info' | 'danger' | 'warning' | 'success'>('info');
  autoCloseAfter = input(0);
  text = input('');
  closeNotification = output();
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    if (this.autoCloseAfter() > 0) {
      this.timer = setTimeout(() => this.closeNotification.emit(), this.autoCloseAfter());
    }
  }
  ngOnDestroy() {
    clearTimeout(this.timer);
  }
}
