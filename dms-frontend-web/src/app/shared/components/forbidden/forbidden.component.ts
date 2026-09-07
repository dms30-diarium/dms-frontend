import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'nuxeo-forbidden',
  template: `<div class="p-6 text-center">
    <h1 class="mb-2 text-2xl font-semibold">Access denied</h1>
    <p>You don’t have permission to view this page.</p>
  </div>`,
})
export class ForbiddenComponent {}
