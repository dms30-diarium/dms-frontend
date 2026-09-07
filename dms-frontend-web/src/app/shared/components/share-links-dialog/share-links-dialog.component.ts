import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { DigiDialog, DigiIconCheck, DigiIconCopy } from '@designsystem-se/af-angular';

export interface ShareLinkItem {
  uid: string;
  title: string;
  link: string;
}

@Component({
  selector: 'nuxeo-share-links-dialog',
  templateUrl: './share-links-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DigiDialog, DigiIconCopy, DigiIconCheck],
})
export class ShareLinksDialogComponent {
  links = input.required<ShareLinkItem[]>();
  dialogClose = output();

  copiedId = signal<string | null>(null);
  allCopied = signal<boolean>(false);

  copyOne(uid: string, link: string): void {
    navigator.clipboard.writeText(link);
    this.copiedId.set(uid);
    this.allCopied.set(false);
  }

  copyAll(): void {
    const text = this.links()
      .map(l => l.link)
      .join('\n');
    navigator.clipboard.writeText(text);
    this.allCopied.set(true);
    this.copiedId.set(null);
  }
}
