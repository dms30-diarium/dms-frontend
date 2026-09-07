import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AccordionComponent } from '@app/shared/components/accordion/accordion.component';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
export interface MotpartForm {
  epost?: string | null;
  address?: string | null;
  zip?: string | null;
  organisationsnummer?: string | null;
  phone?: string | null;
}

@Component({
  selector: 'nuxeo-reduced-create-case-form',
  standalone: true,
  imports: [ReactiveFormsModule, AccordionComponent, ReactiveFormsModule, DigiArbetsformedlingenAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './motpart-info.component.html',
})
export class MotpartInfoComponent implements OnInit {
  motpartTyp = input<string>(NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet);
  protected readonly VOCAB_IDS = NUXEO_VOCAB_IDS;
  formChange = input<(event: Partial<MotpartForm>) => void>();

  readonly form = new FormGroup({
    phone: new FormControl<string>(''),
    epost: new FormControl<string>(''),
    address: new FormControl<string>(''),
    zip: new FormControl<string>(''),
    organisationsnummer: new FormControl<string>(''),
    city: new FormControl<string>(''),
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(data => {
      this.formChange()?.(data);
    });
  }

  changeForm(event: Partial<MotpartForm>) {
    this.formChange()?.(event);
  }
}
