import { ChangeDetectionStrategy, Component, effect, input, OnInit } from '@angular/core';
import { DigiCalendar, DigiIconExclamationTriangleFilled } from '@designsystem-se/af-angular';

@Component({
  selector: 'nuxeo-calendar',
  imports: [DigiCalendar, DigiIconExclamationTriangleFilled],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar.component.html',
})
export class CalendarComponent implements OnInit {
  deadlineDate = input<Date[] | null>();
  reminderDate = input<Date[] | null>();
  private readonly localeSelected = Intl.DateTimeFormat().resolvedOptions().locale;

  constructor() {
    effect(() => {
      this.deleteStyles();
      if (this.deadlineDate()?.length) {
        this.deadlineDate()?.forEach(el => this.styleDeadlineDate(this.toDateFormat(el, this.localeSelected)));
      }
      if (this.reminderDate()?.length) {
        this.reminderDate()?.forEach(el => this.styleReminderDate(this.toDateFormat(el, this.localeSelected)));
      }
    });
  }

  ngOnInit(): void {
    this.deleteStyles();
  }

  toDateFormat(date: number | Date, locale: string) {
    const dateStr = String(date);
    let timestamp: number;

    if (typeof date === 'number') {
      timestamp = date < 1e12 ? date * 1000 : date;
    } else {
      timestamp = Date.parse(dateStr);
    }

    const formatted = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(timestamp);

    return formatted;
  }

  getDynamicStyleTag() {
    let styleTag = document.getElementById('dynamic-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-styles';
      document.head.appendChild(styleTag);
    }
    return styleTag;
  }

  deleteStyles() {
    const tag = this.getDynamicStyleTag();
    tag.remove();
  }

  styleReminderDate(reminderDate: string) {
    const tag = this.getDynamicStyleTag();
    const selector = `.calendar-accordion .nuxeo-calendar .digi-calendar__date[data-date="${reminderDate}"]`;
    const rule = `${selector} { background-color: rgb(221, 164, 30) !important; }`;
    tag.appendChild(document.createTextNode(rule));
  }

  styleDeadlineDate(date: string) {
    const tag = this.getDynamicStyleTag();
    const selector = `.calendar-accordion .nuxeo-calendar .digi-calendar__date[data-date="${date}"]`;
    const rule = `${selector} { background-color: rgb(212, 21, 21) !important; }`;
    tag.appendChild(document.createTextNode(rule));
  }
}
