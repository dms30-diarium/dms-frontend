import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DigiDialog } from '@designsystem-se/af-angular';

@Component({
  selector: 'nuxeo-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DigiDialog],
})
export class ConfirmationDialogComponent {
  text = input.required();
  label = input.required();
  confirm = output();
  canceled = output();
}
