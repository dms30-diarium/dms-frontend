import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { DropdownField, DropdownOption } from '@app/shared/models/dropdown';
import { DigiFormSelectFilter } from '@designsystem-se/af-angular';
import { ReactiveFormsModule } from '@angular/forms';
import { FormSelectFilterValidation } from '@designsystem-se/af';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-dropdown-field',
  imports: [DigiFormSelectFilter, ReactiveFormsModule],
  templateUrl: './dropdown-field.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DropdownFieldComponent {
  controllers = input.required<DropdownField[]>();
  multipleItems = input<boolean>(false);
  FormSelectFilterValidation = FormSelectFilterValidation;

  getRequired(controller: FormControl): boolean {
    return controller.hasValidator(Validators.required);
  }

  onSelect(controller: FormControl<string | string[] | null>, event: CustomEvent<DropdownOption[]>) {
    const options = event.detail;
    const value = this.multipleItems() ? options.map(o => o.value) : (options[0]?.value ?? null);

    controller.setValue(value);
    controller.markAsDirty();
    controller.markAsTouched();
  }

  getValidationState(controller: FormControl): FormSelectFilterValidation {
    if ((controller.touched || controller.dirty) && controller.invalid) {
      return FormSelectFilterValidation.ERROR;
    }
    return FormSelectFilterValidation.NEUTRAL;
  }

  getSelectedItems(field: DropdownField): DropdownOption[] {
    const controller = field.controller;
    const value = controller.value;

    if (Array.isArray(value)) {
      return field.options.filter(option => value.includes(option.value));
    }

    if (value) {
      return field.options.filter(option => option.value === value);
    }

    return [];
  }
}
