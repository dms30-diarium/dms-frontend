import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FileItem } from '@app/pages/case-page/case-types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

@Component({
  selector: 'nuxeo-select-handlings-attachemnts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select-handlings.component.html',
  imports: [ReactiveFormsModule, DigiArbetsformedlingenAngularModule],
})
export class SelectHandlingsComponent implements OnInit {
  caseId = input.required<string>();
  formChange = input.required<(event: string[]) => void>();
  private readonly apiService = inject(NuxeoApiService);

  filesByHandling = signal<FileItem[]>([]);
  form = new FormGroup<Record<string, FormControl<boolean>>>({});
  selectAllControl = new FormControl(false, { nonNullable: true });
  allFileIds = computed(() => this.filesByHandling().flatMap(fileGroup => fileGroup.filer.map(file => file.id)));

  ngOnInit(): void {
    this.apiService.getDownloadAllFiles(this.caseId()).subscribe(data => {
      this.filesByHandling.set(data);
      this.initFileControls(data);
    });

    this.selectAllControl.valueChanges.subscribe(checked => {
      this.toggleAll(checked);
    });

    this.form.valueChanges.subscribe(() => {
      const selectedFileIds = this.collectSelectedFileIds();
      const allFilesSelected = this.allFileIds().length > 0 && selectedFileIds.length === this.allFileIds().length;
      this.selectAllControl.setValue(allFilesSelected, { emitEvent: false });
      this.formChange()(selectedFileIds);
    });
  }

  toggleHandlingSelection(handling: FileItem): void {
    const allSelected = this.isAllHandlingFilesSelected(handling.filer);
    this.toggleHandlingFiles(handling.filer, !allSelected);
  }

  toggleHandlingFiles(handlingFiles: FileItem['filer'], checked: boolean): void {
    handlingFiles.forEach(file => {
      this.form.controls[file.id].setValue(checked, { emitEvent: false });
    });
    this.emitCurrentSelection();
  }

  isAllHandlingFilesSelected(handlingFiles: FileItem['filer']): boolean {
    return handlingFiles.every(file => this.form.controls[file.id].value === true);
  }

  selectedCountForHandling(handlingFiles: FileItem['filer']): number {
    return handlingFiles.filter(file => this.form.controls[file.id].value === true).length;
  }

  private emitCurrentSelection(): void {
    const selectedFileIds = this.collectSelectedFileIds();
    const allFilesSelected = this.allFileIds().length > 0 && selectedFileIds.length === this.allFileIds().length;
    this.selectAllControl.setValue(allFilesSelected, { emitEvent: false });
    this.formChange()(selectedFileIds);
  }

  private collectSelectedFileIds(): string[] {
    return Object.entries(this.form.value)
      .filter(([_fileId, selected]) => selected === true)
      .map(([fileId]) => fileId);
  }

  private initFileControls(fileGroups: FileItem[]): void {
    fileGroups.forEach(fileGroup => {
      fileGroup.filer.forEach(file => {
        if (!this.form.contains(file.id)) {
          this.form.addControl(file.id, new FormControl(false, { nonNullable: true }));
        }
      });
    });
  }

  private toggleAll(checked: boolean): void {
    Object.keys(this.form.controls).forEach(fileId => {
      this.form.controls[fileId].setValue(checked, { emitEvent: false });
    });

    this.emitCurrentSelection();
  }
}
