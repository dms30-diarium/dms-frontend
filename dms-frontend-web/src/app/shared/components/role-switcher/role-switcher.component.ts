import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '@app/core/services/auth.service';
import { AppRole } from '@app/shared/models/roles';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-role-switcher',
  standalone: true,
  imports: [FormsModule],
  template: `
    <select [ngModel]="active()" (ngModelChange)="onChange($event)">
      @for (r of roles(); track r) {
        <option [value]="r">{{ r }}</option>
      }
    </select>
  `,
})
export class RoleSwitcherComponent {
  auth = inject(AuthService);
  roles = this.auth.roles;
  active = this.auth.activeRole;
  onChange(role: AppRole) {
    this.auth.setActiveRole(role);
  }
}
