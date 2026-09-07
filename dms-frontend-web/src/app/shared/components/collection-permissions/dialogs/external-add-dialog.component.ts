import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

import { Option } from '@app/shared/commonTypes';
import { ExternalPermissionFormControls } from '@app/shared/components/collection-permissions/collection-permissions.types';

@Component({
  selector: 'nuxeo-external-permission-add-dialog',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule],
  templateUrl: './external-add-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExternalAddDialogComponent {
  form = input.required<FormGroup<ExternalPermissionFormControls>>();
  permissionOptions = input.required<Option[]>();

  dialogClose = output<void>();
  formSubmit = output<void>();
}
