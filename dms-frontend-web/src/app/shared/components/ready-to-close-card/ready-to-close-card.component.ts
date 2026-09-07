import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DigiButton } from '@designsystem-se/af-angular';

export interface Field {
  label: string;
  value: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-ready-to-close-card',
  imports: [DigiButton],
  templateUrl: './ready-to-close-card.component.html',
})
export class ReadyToCloseCardComponent {
  title = input<string>();
  fields = input<Field[]>([]);

  fail = output<void>();
  sucess = output<void>();

  onCancel() {
    this.fail.emit();
  }

  onSuccess() {
    this.sucess.emit();
  }
}
