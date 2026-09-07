import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShareLinkService {
  buildDocLink(docId: string | null | undefined): string {
    if (!docId) return '';

    const origin = window.location.origin;
    return `${origin}/nuxeo/app/doc/${docId}`;
  }

  copyDocumentLink(docId: string | null | undefined, setCopied: (copied: boolean) => void, timeoutMs = 1500): void {
    const link = this.buildDocLink(docId);
    if (!link) {
      console.warn('Ingen länk att kopiera.');
      return;
    }

    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, timeoutMs);
    });
  }
}
