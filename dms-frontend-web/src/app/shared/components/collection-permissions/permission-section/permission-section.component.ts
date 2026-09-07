import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-collection-permissions-section',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule],
  templateUrl: './permission-section.component.html',
})
export class PermissionSectionComponent {
  title = input.required<string>();
  actionLabel = input<string | null>(null);
  actionAriaLabel = input<string | null>(null);
  showAction = input(true);
  actionDisabled = input(false);
  actionVariation = input<'function' | 'primary' | 'secondary'>('function');
  alertText = input<string | null>(null);

  actionClick = output<void>();
}
