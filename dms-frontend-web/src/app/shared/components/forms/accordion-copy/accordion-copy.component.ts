import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AccordionComponent } from '../../accordion/accordion.component';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

@Component({
  selector: 'nuxeo-accordion-copy',
  standalone: true,
  imports: [ReactiveFormsModule, AccordionComponent, ReactiveFormsModule, DigiArbetsformedlingenAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accordion-copy.component.html',
})
export class AccordionCopyComponent implements OnInit {
  formChange = input<(event: Record<string, string | null>) => void>();

  readonly form = new FormGroup({
    ccRecipients: new FormControl<string>(''),
    bccRecipients: new FormControl<string>(''),
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(data => {
      this.formChange()?.(data);
    });
  }

  changeForm(event: Record<string, string | null>) {
    this.formChange()?.(event);
  }
}
