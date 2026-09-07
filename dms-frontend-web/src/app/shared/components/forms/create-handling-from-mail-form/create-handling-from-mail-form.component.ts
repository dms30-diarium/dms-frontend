import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-create-handling-from-mail-form',
  standalone: true,
  imports: [GeneralFormComponent],
  templateUrl: './create-handling-from-mail-form.component.html',
})
export class CreateHandlingFromMailFormComponent {
  handlingConfig = input<FieldConfig[]>([]);
  fileConfig = input<FieldConfig[]>([]);
  isLoading = input<boolean>(false);
  isSubmitted = input<boolean>(false);
  subLabel = input<string>('');

  changeForm = output<Record<string, string>>();
  selectedOptionChanged = output<{ selectedValue: string; fieldName: string; formValue?: Record<string, string> }>();
  selectedRadioChanged = output<{ selectedValue: string; fieldName: string }>();
  dropdownChanged = output<{
    fieldName: string;
    value: string | null | unknown;
    formValue?: Record<string, string>;
  }>();
  dialogClose = output<null>();

  private readonly firstColumnFieldNames = new Set(['type', 'name']);
  private readonly secondColumnFieldNames = new Set(['dateFrom', 'secret', 'lagrum']);

  firstColumnConfig = computed(() => {
    const config = this.handlingConfig() ?? [];
    return config.filter(field => this.firstColumnFieldNames.has(field.name));
  });

  secondColumnConfig = computed(() => {
    const config = this.handlingConfig() ?? [];
    return config.filter(field => this.secondColumnFieldNames.has(field.name));
  });

  thirdColumnConfig = computed(() => {
    const config = this.handlingConfig() ?? [];
    return config.filter(
      field => !this.firstColumnFieldNames.has(field.name) && !this.secondColumnFieldNames.has(field.name)
    );
  });

  onChangeForm(event: Record<string, string>) {
    this.changeForm.emit(event);
  }

  onSelectedOptionChanged(event: { selectedValue: string; fieldName: string; formValue?: Record<string, string> }) {
    this.selectedOptionChanged.emit(event);
  }

  onSelectedRadioChanged(event: { selectedValue: string; fieldName: string }) {
    this.selectedRadioChanged.emit(event);
  }

  onDropdownChanged(event: { fieldName: string; value: string | null | unknown; formValue?: Record<string, string> }) {
    this.dropdownChanged.emit(event);
  }

  onDialogClose() {
    this.dialogClose.emit(null);
  }
}
