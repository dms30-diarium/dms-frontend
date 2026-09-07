import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ImageButtonComponent } from '@shared/components/image-button/image-button.component';
import { DropdownFieldComponent } from '@shared/components/dropdown-field/dropdown-field.component';
import { DropdownField } from '@app/shared/models/dropdown';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-generic-dropdown-modal',
  imports: [ImageButtonComponent, DropdownFieldComponent],
  templateUrl: './generic-dropdown-modal.component.html',
})
export class GenericDropdownModalComponent {
  icon = 'X';
  controllers = input.required<DropdownField[]>();
  title = input();
  blueButton = input('Tilldela');

  success = output<void>();
  cancelled = output<void>();

  onSuccess() {
    this.success.emit();
  }
  onCancel() {
    this.cancelled.emit();
  }
}
