import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'nuxeo-collection-permission-delete-dialog',
  standalone: true,
  imports: [],
  templateUrl: './delete-permission-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletePermissionDialogComponent {
  principal = input.required<string>();
  right = input.required<string>();
  timeFrame = input.required<string>();
  grantedBy = input.required<string>();
}
