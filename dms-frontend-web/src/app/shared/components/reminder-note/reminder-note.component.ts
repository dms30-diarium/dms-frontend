import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { AngularEditorModule } from '@kolkov/angular-editor';

@Component({
  selector: 'nuxeo-reminder-note',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, AngularEditorModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reminder-note.component.html',
})
export class ReminderNoteComponent {
  noteControl = new FormControl('');
  initialValue = input.required<string | undefined>();
  showCancelButton = input<boolean>();
  closeDialog = output();
  saveNoteObject = output<string | null>();

  editorConfig = {
    editable: true,
    spellcheck: true,
    minHeight: '250px',
    toolbarHiddenButtons: [
      [
        'insertHorizontalRule',
        'unlink',
        'subscript',
        'superscript',
        'heading',
        'fontName',
        'fontSize',
        'colorPicker',
        'textColor',
        'backgroundColor',
      ],
      [
        'justifyFull',
        'indent',
        'outdent',
        'insertUnorderedList',
        'insertOrderedList',
        'link',
        'insertImage',
        'insertVideo',
        'removeFormat',
        'undo',
        'redo',
        'toggleEditorMode',
      ],
    ],
  };

  constructor() {
    effect(() => {
      const val = this.initialValue();
      if (val) {
        this.noteControl.setValue(val);
      }
    });
  }
}
