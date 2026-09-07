import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

import { Option } from '@app/shared/commonTypes';
import { PermissionFormControls } from '@app/shared/components/collection-permissions/collection-permissions.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-collection-permission-dialog',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule],
  templateUrl: './permission-dialog.component.html',
})
export class PermissionDialogComponent {
  mode = input.required<'add' | 'edit'>();
  form = input.required<FormGroup<PermissionFormControls>>();
  principalOptions = input.required<Option[]>();
  permissionOptions = input.required<Option[]>();

  dialogClose = output<void>();
  formSubmit = output<void>();
  principalQueryChanged = output<CustomEvent<string>>();
  principalSelected = output<CustomEvent<Option[]>>();
}
