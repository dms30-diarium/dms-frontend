import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  DigiIconTrash,
  DigiIconDownload,
  DigiIconStar,
  DigiIconStarReg,
  DigiIconRedo,
  DigiIconFileExport,
  DigiIconPrint,
  DigiIconUnlock,
  DigiIconShareAlt,
  DigiIconBell,
  DigiIconBellFilled,
  DigiIconLock,
} from '@designsystem-se/af-angular';
import { ImageButtonComponent } from '../image-button/image-button.component';

@Component({
  selector: 'nuxeo-top-buttons-panel',
  templateUrl: './top-buttons-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DigiIconTrash,
    ImageButtonComponent,
    DigiIconDownload,
    DigiIconStar,
    DigiIconStarReg,
    NgTemplateOutlet,
    DigiIconRedo,
    DigiIconFileExport,
    DigiIconPrint,
    DigiIconUnlock,
    DigiIconShareAlt,
    DigiIconBell,
    DigiIconBellFilled,
    DigiIconLock,
  ],
})
export class TopButtonsPanelComponent {
  selectedFiles = input<string[]>([]);
  shouldDisplayTrashButton = input<boolean>(false);
  trashButtonTitle = input<string>('Radera');
  trashButtonIcon = input<'trash' | 'collection'>('trash');
  showDownload = input<boolean>(true);
  showPrint = input<boolean>(false);
  showDownloadCsv = input<boolean>(false);
  showFavorites = input<boolean>(true);
  showRedo = input<boolean>(false);
  showAssignToCollection = input<boolean>(true);
  showLock = input<boolean>(false);
  showShare = input<boolean>(false);
  showNotification = input<boolean>(false);
  lockState = input<{ allLocked: boolean; allUnlocked: boolean; mixed: boolean } | null>(null);
  favoriteState = input<{ allFavorited: boolean; allUnfavorited: boolean; mixed: boolean } | null>(null);
  subscriptionState = input<{ allSubscribed: boolean; allUnsubscribed: boolean; mixed: boolean } | null>(null);
  deleteSelectedItems = output();
  downloadFiles = output();
  printFiles = output();
  downloadCsv = output();
  restoreSelection = output();
  assignToCollection = output();
  addToFavorites = output();
  redo = output();
  lockFiles = output();
  shareFiles = output();
  notifyFiles = output();
}
