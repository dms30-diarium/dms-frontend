import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { Contact } from '../../contact-table/contact-table.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-contact-button-with-dialog',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule],
  templateUrl: './contact-button-with-dialog.component.html',
})
export class ContactButtonWithDialogComponent {
  isContactDialogOpen = signal(false);
  addedContact = output<Contact>();
  heading = input<string>();

  form = new FormGroup({
    name: new FormControl(''),
    email: new FormControl(''),
    phone: new FormControl(''),
    org: new FormControl(''),
    adress: new FormControl(''),
    postnummer: new FormControl(''),
    city: new FormControl(''),
  });

  addContact() {
    this.addedContact.emit(this.form.value);
  }
}
