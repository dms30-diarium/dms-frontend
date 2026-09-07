import { ChangeDetectionStrategy, Component, effect, input, OnInit, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { map, Observable, tap } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-autocomplete',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatAutocompleteModule, ReactiveFormsModule, AsyncPipe],
  templateUrl: './autocomplete.component.html',
})
export class AutocompleteComponent implements OnInit {
  path = input<string | null>(null);
  autocompleteControl = new FormControl('');
  options = input<string[]>(['']);
  hasDocuments = input<boolean>(true);
  valueChange = output<string>();
  filteredOptions: Observable<string[]> | null = null;

  constructor() {
    effect(() => {
      this.showSuggestions();
      this.options();
    });
    effect(() => {
      this.autocompleteControl.setValue(this.path());
    });
  }

  ngOnInit() {
    this.filteredOptions = this.autocompleteControl.valueChanges.pipe(
      tap(value => this.valueChange.emit(value ?? '')),
      map(value => this._filter(value || ''))
    );
  }

  showSuggestions() {
    this.autocompleteControl.setValue(this.autocompleteControl.value || '');
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.options().filter(option => option.toLowerCase().includes(filterValue));
  }
}
