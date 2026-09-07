import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ImageButtonComponent } from '../image-button/image-button.component';

@Component({
  selector: 'nuxeo-toggle-button',
  standalone: true,
  imports: [ImageButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toggle-button.component.html',
  styleUrl: './toggle-button.component.scss',
})
export class ToggleButtonComponent {
  activeButton = input<number>(2);
  iconLeft = input<string | null>(null);
  iconRight = input<string | null>(null);
  textLeft = input<string | null>(null);
  textRight = input<string | null>(null);
  choiceChange = output<number>();

  get isGrid(): boolean {
    return this.activeButton() === 1;
  }

  get isTable(): boolean {
    return this.activeButton() === 2;
  }

  setActive(targetButton: number): void {
    if (targetButton === this.activeButton()) {
      return;
    }

    this.choiceChange.emit(targetButton);
  }
}
