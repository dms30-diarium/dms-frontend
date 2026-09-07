import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { DigiFormFileUpload } from '@designsystem-se/af-angular';

export interface UploadedFile extends File {
  id: string;
}
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-file-upload',
  standalone: true,
  imports: [DigiFormFileUpload],
  templateUrl: './file-upload.component.html',
})
export class FileUploadComponent {
  files = signal<UploadedFile[]>([]);
  filesChange = output<UploadedFile[]>();
  type = input<string>();
  maxFiles = input<number | null>(null);
  errorMessage = input<string | null>();

  addFiles(newFile: UploadedFile) {
    const currentFiles = this.files();
    this.files.set([...currentFiles, newFile]);
    this.filesChange.emit(this.files());
  }

  clearFiles(file: UploadedFile) {
    const filteredFiles = this.files().filter(el => el.name !== file.name);
    this.files.set(filteredFiles);
    this.filesChange.emit(this.files());
  }
}
