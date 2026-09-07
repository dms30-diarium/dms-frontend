import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { WarningCardComponent } from '../warning-card/warning-card.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-close-case-warning',
  standalone: true,
  imports: [WarningCardComponent, DigiArbetsformedlingenAngularModule],
  templateUrl: './close-case-warning.component.html',
})
export class CloseCaseWarningComponent {
  // TODO: waiting for backend to get the data
  readonly gallringsDatumOptions = ['2 years', '5 years', '10 years'];

  comment = input<string>('');
  gallringsKommentar = input<string>('');
  gallringsDatum = input<string>('');

  commentChange = output<string>();
  gallringsKommentarChange = output<string>();
  gallringsDatumChange = output<string>();
  action = output<'cancel' | 'confirm'>();

  onCommentInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.commentChange.emit(value);
  }

  onGallringsKommentarInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.gallringsKommentarChange.emit(value);
  }

  onGallringsDatumInput(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.gallringsDatumChange.emit(value);
  }

  onAction(event: 'cancel' | 'confirm') {
    this.action.emit(event);
  }
}
