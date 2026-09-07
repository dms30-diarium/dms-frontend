import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

import { Option } from '@app/shared/commonTypes';
import { ExternalPermissionFormControls } from '@app/shared/components/collection-permissions/collection-permissions.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-external-permission-edit-dialog',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule],
  templateUrl: './external-edit-dialog.component.html',
})
export class ExternalEditDialogComponent {
  form = input.required<FormGroup<ExternalPermissionFormControls>>();
  permissionOptions = input.required<Option[]>();

  dialogClose = output<void>();
  formSubmit = output<void>();
}
