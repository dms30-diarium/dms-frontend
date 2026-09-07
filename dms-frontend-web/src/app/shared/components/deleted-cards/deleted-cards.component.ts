import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { ImageButtonComponent } from '../image-button/image-button.component';

@Component({
  selector: 'nuxeo-deleted-cards',
  templateUrl: './deleted-cards.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DigiArbetsformedlingenAngularModule, ImageButtonComponent],
})
export class DeletedCardsComponent {
  columns = input<number>(2);
  isEditable = input<boolean>(false);
  cards = input<NuxeoDocument[]>([]);
  selectedIds = signal<string[]>([]);
  selectedItemsArray = output<string[]>();
  restoreSelectedFiles = output<string>();
  deleteSelectedFiles = output<string>();

  getDate(date: string | Date | undefined | null | unknown): string {
    return formatDateOrMissing(date);
  }

  selectItem(uid: string) {
    if (this.selectedIds().includes(uid)) {
      this.selectedIds.set(this.selectedIds().filter(id => id !== uid));
    } else {
      this.selectedIds.set([...this.selectedIds(), uid]);
    }
    this.selectedItemsArray.emit(this.selectedIds());
  }
}
