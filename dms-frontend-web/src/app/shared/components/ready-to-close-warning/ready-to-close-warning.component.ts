import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { WarningCardComponent } from '../warning-card/warning-card.component';
import { Option } from '@app/shared/commonTypes';

@Component({
  selector: 'nuxeo-ready-to-close-warning',
  standalone: true,
  imports: [WarningCardComponent, DigiArbetsformedlingenAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ready-to-close-warning.component.html',
})
export class ReadyToCloseWarningComponent {
  alreadyMarked = input<boolean>(false);
  utkastCount = input<number>(0);
  decision = input<string>('');
  decisionOptions = input<Option[] | undefined>(undefined);
  decisionLocked = input<boolean>(false);
  decisionDate = input<string>('');
  beslutsfattare = input<string>('');
  beslutsfattareOptions = input<Option[] | undefined>(undefined);

  decisionChange = output<string>();
  decisionDateChange = output<string>();
  beslutsfattareChange = output<string>();
  action = output<'cancel' | 'confirm'>();

  onDecisionInput(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.decisionChange.emit(value);
  }

  onDecisionDateInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.decisionDateChange.emit(value);
  }

  onBeslutsfattareInput(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.beslutsfattareChange.emit(value);
  }

  onAction(event: 'cancel' | 'confirm') {
    this.action.emit(event);
  }

  getTitle(): string {
    return this.alreadyMarked() ? 'Ärendet är redan markerat som redo att avslutas' : 'Markera som redo att avslutas';
  }

  getMessage(): string[] {
    if (this.alreadyMarked()) {
      return ['Detta ärende är redan markerat som redo att avslutas.'];
    }

    return [
      'Vill du verkligen markera ärendet som redo att avslutas?',
      'Det betyder att ärendet ändrar status till Redo att avslutas.',
    ];
  }

  showConfirmButton(): boolean {
    return (
      !this.alreadyMarked() && this.utkastCount() === 0 && !!this.decision().trim() && !!this.decisionDate().trim()
    );
  }

  getDecisionLabel(): string {
    return this.decisionOptions()?.find(opt => opt.id === this.decision())?.label ?? this.decision();
  }
}
