import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { WeeklyTaskColumn } from '../types';
import { BackdropClickDirective } from '@app/shared/directives/backdrop-click.directive';
import { ThemeService } from '@app/core/services/theme.service';

@Component({
  selector: 'nuxeo-weekly-tasks-table',
  standalone: true,
  imports: [RouterModule, DigiArbetsformedlingenAngularModule, BackdropClickDirective],
  templateUrl: './weekly-tasks-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyTasksTableComponent {
  readonly themeService = inject(ThemeService);
  weekLabel = input<string>('');
  columns = input<WeeklyTaskColumn[]>([]);
  loading = input<boolean>(false);
  previousWeek = output<void>();
  nextWeek = output<void>();
  openPopoverKey = signal<string | null>(null);

  togglePopover(key: string): void {
    this.openPopoverKey.update(current => (current === key ? null : key));
  }

  closePopover(): void {
    this.openPopoverKey.set(null);
  }

  getDayMonthLabel(date: Date): string {
    const safeDate = formatDateOrMissing(date);
    if (!safeDate) return '';
    return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long' }).format(date);
  }

  getButtonText(tasks: number) {
    return `${tasks - 2} tasks left`;
  }
}
