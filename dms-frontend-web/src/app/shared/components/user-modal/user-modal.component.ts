import { ChangeDetectionStrategy, Component, effect, input } from '@angular/core';

import { NxUser } from '@app/shared/api/nuxeo-api.types';
import { getUserDisplayName, getUserInitials } from '@app/shared/utils/display-label';

export interface UserDialogData {
  user?: NxUser;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-user-modal',
  standalone: true,
  imports: [],
  templateUrl: './user-modal.component.html',
})
export class UserModalComponent {
  user = input<NxUser | undefined>();

  constructor() {
    effect(() => {
      const currentUser = this.user();

      if (!currentUser) {
        return;
      }
    });
  }

  get initials(): string {
    return getUserInitials(this.user());
  }

  get displayName(): string {
    return getUserDisplayName(this.user());
  }
}
