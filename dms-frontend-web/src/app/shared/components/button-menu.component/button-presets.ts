import { ActionButton } from './button-menu.component';

export type ButtonPresetKey =
  | 'addToCollection'
  | 'assignHandler'
  | 'bookmark'
  | 'bookmarkActive'
  | 'changeHandler'
  | 'changeRequester'
  | 'changeResponsibleHandler'
  | 'checkEmail'
  | 'clear'
  | 'closeCase'
  | 'collection'
  | 'consultColleague'
  | 'createHandling'
  | 'createHandlingFromDraft'
  | 'createHandlingFromMail'
  | 'createImportFile'
  | 'createServiceNote'
  | 'createNotification'
  | 'deadlineReminder'
  | 'downloadHandlingZip'
  | 'downloadAllFiles'
  | 'edit'
  | 'exportAllCaseHandlingar'
  | 'sendForReview'
  | 'exportHandling'
  | 'extractData'
  | 'favorite'
  | 'favoriteActive'
  | 'inCollection'
  | 'lock'
  | 'markFavorite'
  | 'markFavoriteActive'
  | 'notify'
  | 'printDiarySheet'
  | 'printDocument'
  | 'readyToClose'
  | 'expeditHandling'
  | 'requestCompletion'
  | 'sendBeslut'
  | 'sendEmail'
  | 'sendForApproval'
  | 'share'
  | 'startImport'
  | 'stopNotify'
  | 'trashCollection'
  | 'subscribeChanges'
  | 'unlock'
  | 'unsubscribe'
  | 'deliverPublicDocs'
  | 'writeNote';

type ButtonPreset = Pick<ActionButton, 'text' | 'icon'>;

export const BUTTON_PRESETS = {
  addToCollection: { text: 'Lägg till i samling', icon: 'Bookmark' },
  assignHandler: { text: 'Tilldela ansvarig handläggare', icon: 'UserPen' },
  bookmark: { text: 'Bokmärk', icon: 'Star' },
  bookmarkActive: { text: 'Bokmärk', icon: 'StarFull' },
  changeHandler: { text: 'Hantera handläggare', icon: 'UserPen' },
  changeRequester: { text: 'Byt ansvarig godkännare', icon: 'UserPen' },
  changeResponsibleHandler: { text: 'Byt ansvarig handläggare', icon: 'UserPen' },
  checkEmail: { text: 'Kontrollera e-post', icon: 'Email' },
  clear: { text: 'Rensa', icon: 'Trash2' },
  closeCase: { text: 'Stäng ärende', icon: 'Check' },
  consultColleague: { text: 'Rådgör med kollega/grupp', icon: 'Users' },
  collection: { text: 'Samling', icon: 'Samling' },
  createHandling: { text: 'Skapa handling', icon: 'FileText' },
  createHandlingFromDraft: { text: 'Upprätta till handling', icon: 'Success' },
  createHandlingFromMail: { text: 'Skapa handling', icon: 'FileText' },
  createImportFile: { text: 'Skapa importfil', icon: 'FileText' },
  createServiceNote: { text: 'Upprätta tjänsteanteckning', icon: 'BubbleEllipsis' },
  deliverPublicDocs: { text: 'Utlämning av allmän handling', icon: 'BubbleEllipsis' },
  createNotification: { text: 'Skapa notis', icon: 'Bell' },
  deadlineReminder: { text: 'Deadline och påminnelse', icon: 'Clock' },
  downloadHandlingZip: { text: 'Ladda ned handling som ZIP', icon: 'Download' },
  edit: { text: 'Redigera', icon: 'Pencil' },
  exportHandling: { text: 'Exportera handling', icon: 'FileExport' },
  extractData: { text: 'Extrahera data', icon: 'FileExport' },
  favorite: { text: 'Favorisera', icon: 'Star' },
  favoriteActive: { text: 'Favorisera', icon: 'StarFull' },
  inCollection: { text: 'Sparad i samling', icon: 'BookmarkFull' },
  lock: { text: 'Lås', icon: 'LockOpen' },
  markFavorite: { text: 'Markera som favorit', icon: 'Star' },
  markFavoriteActive: { text: 'Markera som favorit', icon: 'StarFull' },
  notify: { text: 'Notifiera', icon: 'BellOff' },
  printDiarySheet: { text: 'Skriva ut dagboksblad', icon: 'Printer' },
  printDocument: { text: 'Skriv ut', icon: 'Printer' },
  readyToClose: { text: 'Ärende redo att avslutas', icon: 'Check' },
  expeditHandling: { text: 'Expediera handling', icon: 'Send' },
  requestCompletion: { text: 'Begäran om komplettering', icon: 'Email' },
  downloadAllFiles: { text: 'Ladda ner alla filer', icon: 'Download' },
  exportAllCaseHandlingar: { text: 'Exportera alla handlingar på ärendet', icon: 'FileExport' },
  sendBeslut: { text: 'Skicka beslut', icon: 'Send' },
  sendEmail: { text: 'Skicka e-post', icon: 'Email' },
  sendForApproval: { text: 'Skicka för beslutsfattare / godkännare', icon: 'UserPen' },
  sendForReview: { text: 'Sänd för granskning', icon: 'Review' },
  share: { text: 'Dela', icon: 'Share2' },
  startImport: { text: 'Starta import', icon: 'Download' },
  stopNotify: { text: 'Avsluta', icon: 'Bell' },
  trashCollection: { text: 'Ta bort samling', icon: 'Trash2' },
  subscribeChanges: { text: 'Notifera mig om ändringar', icon: 'Bell' },
  unlock: { text: 'Lås upp', icon: 'LockClose' },
  unsubscribe: { text: 'Avsluta prenumeration', icon: 'BellOff' },
  writeNote: { text: 'Skriv en notering/kom ihåg', icon: 'Bubble' },
} satisfies Record<ButtonPresetKey, ButtonPreset>;

export function createButton(preset: ButtonPresetKey, click: ActionButton['click']): ActionButton {
  const definition = BUTTON_PRESETS[preset];
  return { ...definition, click };
}
