import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-image-button',
  imports: [DigiArbetsformedlingenAngularModule, SvgIconComponent],
  templateUrl: './image-button.component.html',
})
export class ImageButtonComponent {
  icon = input<string>();
  text = input.required<string>();
  size = input<'large' | 'medium' | 'small'>();
  variation = input<'primary' | 'secondary' | 'function'>();
  slot = input<'icon-secondary' | 'icon'>();

  buttonClick = output();

  onButtonClick() {
    this.buttonClick.emit();
  }
}
