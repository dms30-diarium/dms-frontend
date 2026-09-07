import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DigiButton } from '@designsystem-se/af-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-warning-card',
  standalone: true,
  imports: [DigiButton],
  templateUrl: './warning-card.component.html',
})
export class WarningCardComponent {
  cancelButtonTextSig = input<string>('Avbryt');
  blueButtonTextSig = input<string>();
  title = input<string>();
  message = input<string[]>();
  showConfirmButton = input<boolean>(true);

  action = output<'cancel' | 'confirm'>();

  onCancel() {
    this.action.emit('cancel');
  }

  onConfirm() {
    this.action.emit('confirm');
  }
}
