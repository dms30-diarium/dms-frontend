import { inject, Injectable, signal } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { MessagesJson, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { NotificationType } from '@app/shared/components/notification/notification.component';

export interface BaseButton {
  text: string;
  icon: string;
  click: () => void;
}
@Injectable({ providedIn: 'root' })
export class GeneralStore {
  lastCreatedCase = signal<NuxeoDocument | null>(null);
  notification = signal<NotificationType>({ show: false });
  baseButtons = signal<BaseButton[]>([]);
  navigationPanelContext = signal<'browse' | 'info' | null>(null);
  openPage = signal<string | null>(null);
  apiService = inject(NuxeoApiService);
  messagesInfo = signal<MessagesJson | null>(null);

  constructor() {
    this.apiService.getMessagesJSON().subscribe(data => this.messagesInfo.set(data));
  }

  getLabelByType(docType: string) {
    const messages = this.messagesInfo();
    if (!messages) return docType;

    const key = `label.document.type.${docType.toLowerCase()}`;
    return messages[key] || docType;
  }
  getValue(key: string) {
    const messages = this.messagesInfo();
    return messages?.[key];
  }

  getSchemaByType(docType: string, field: string) {
    const messages = this.messagesInfo();
    if (!messages) return docType;

    const key = `label.ui.schema.${docType.toLowerCase()}.${field.toLowerCase()}`;
    return messages[key] || docType;
  }
  getStatus(status: string) {
    const messages = this.messagesInfo();

    const key = `label.ui.state.${status}`;
    return messages?.[key] || status;
  }
}
