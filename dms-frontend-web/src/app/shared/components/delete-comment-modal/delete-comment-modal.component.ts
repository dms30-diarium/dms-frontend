import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { DigiButton } from '@designsystem-se/af-angular';

@Component({
  selector: 'nuxeo-delete-comment-modal',
  standalone: true,
  imports: [DigiButton],
  templateUrl: './delete-comment-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteCommentModalComponent {
  cancelled = output<void>();
  confirmed = output<void>();

  onCancel() {
    this.cancelled.emit();
  }

  onConfirm() {
    this.confirmed.emit();
  }
}
