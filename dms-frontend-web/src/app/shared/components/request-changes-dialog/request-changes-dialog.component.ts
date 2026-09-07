import { ChangeDetectionStrategy, Component, input, OnInit, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  DigiArbetsformedlingenAngularModule,
  DigiButton,
  DigiDialog,
  DigiFormTextarea,
} from '@designsystem-se/af-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-request-changes-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DigiDialog, DigiButton, DigiFormTextarea, DigiArbetsformedlingenAngularModule],
  templateUrl: './request-changes-dialog.component.html',
})
export class RequestChangesDialogComponent implements OnInit {
  open = input.required<boolean>();
  cancelDialog = output();
  submitComment = output<string>();

  commentControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  ngOnInit(): void {
    this.commentControl.reset('');
  }

  onCancel() {
    this.commentControl.reset('');
    this.cancelDialog.emit();
  }

  onSubmit() {
    this.commentControl.markAsTouched();
    const value = this.commentControl.value.trim();
    if (!value) return;

    this.submitComment.emit(value);
    this.commentControl.reset('');
  }
}
