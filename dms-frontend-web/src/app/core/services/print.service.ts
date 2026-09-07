import { Injectable } from '@angular/core';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

export interface PrintableDocument {
  file: NuxeoDocument;
  url: string;
  delayMs?: number;
}

@Injectable({ providedIn: 'root' })
export class PrintService {
  printUrl(url: string, delayMs = 1000, onDone?: () => void): void {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.src = url;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      iframe.remove();
      onDone?.();
    };

    iframe.onload = () => {
      const targetWindow = iframe.contentWindow;
      if (!targetWindow) {
        finish();
        return;
      }

      const afterPrint = () => {
        targetWindow.removeEventListener('afterprint', afterPrint);
        finish();
      };

      targetWindow.addEventListener('afterprint', afterPrint);

      setTimeout(() => {
        try {
          targetWindow.focus();
          targetWindow.print();
        } catch {
          afterPrint();
        }
      }, delayMs);

      setTimeout(afterPrint, 30000);
    };

    document.body.appendChild(iframe);
  }

  getPrintableTarget(file: NuxeoDocument): { url: string; delayMs?: number } | null {
    const fileContent = file?.properties?.[NUXEO_SCHEMA_FIELDS.file.content];
    const watermarkContent = file?.properties?.[NUXEO_SCHEMA_FIELDS.fil.vattenstampel];
    const useFileContent = !!fileContent?.['mime-type'] || !!fileContent?.name;
    const effectiveContent = useFileContent ? fileContent : watermarkContent;
    const mime = (effectiveContent?.['mime-type'] ?? '').toLowerCase();

    if (mime.startsWith('video/') || mime.startsWith('audio/')) {
      return null;
    }

    if (mime.startsWith('image/')) {
      const imageUrl = useFileContent
        ? this.buildNxFileUrl(file.uid, NUXEO_SCHEMA_FIELDS.file.content, fileContent?.name, file.changeToken)
        : this.buildNxFileUrl(
            file.uid,
            NUXEO_SCHEMA_FIELDS.fil.vattenstampel,
            watermarkContent?.name,
            file.changeToken
          );
      return { url: imageUrl, delayMs: 500 };
    }

    if (mime === 'application/pdf') {
      const fileUrl = useFileContent
        ? this.buildNxFileUrl(file.uid, NUXEO_SCHEMA_FIELDS.file.content, fileContent?.name, file.changeToken)
        : this.buildNxFileUrl(
            file.uid,
            NUXEO_SCHEMA_FIELDS.fil.vattenstampel,
            watermarkContent?.name,
            file.changeToken
          );
      return { url: this.buildPdfViewerUrl(fileUrl), delayMs: 1500 };
    }

    const renditionUrl = `/nuxeo/api/v1/repo/default/id/${file.uid}/@rendition/pdf`;
    return { url: this.buildPdfViewerUrl(renditionUrl), delayMs: 1500 };
  }

  getPrintableDocuments(files: NuxeoDocument[]): PrintableDocument[] {
    return files.flatMap(file => {
      const target = this.getPrintableTarget(file);
      return target ? [{ file, ...target }] : [];
    });
  }

  printDocuments(queue: PrintableDocument[], onBeforePrint: (file: NuxeoDocument) => void, onDone: () => void): void {
    const next = queue.shift();
    if (!next) {
      onDone();
      return;
    }

    onBeforePrint(next.file);
    this.printUrl(next.url, next.delayMs ?? 1000, () => this.printDocuments(queue, onBeforePrint, onDone));
  }

  private buildNxFileUrl(uid: string, xpath: string, name?: string, changeToken?: string): string {
    const safeName = encodeURIComponent(name ?? 'file');
    const token = changeToken ? `?changeToken=${encodeURIComponent(changeToken)}` : '';
    return `/nuxeo/nxfile/default/${uid}/${xpath}/${safeName}${token}`;
  }

  private buildPdfViewerUrl(fileUrl: string): string {
    const encodedFileUrl = encodeURIComponent(fileUrl);
    return `/nuxeo/ui/vendor/pdfjs/web/viewer.html?file=${encodedFileUrl}`;
  }
}
