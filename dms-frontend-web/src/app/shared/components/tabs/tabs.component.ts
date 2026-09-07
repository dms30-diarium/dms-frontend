import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';

import { DigiTablist, DigiTablistPanel } from '@designsystem-se/af-angular';
import { DigiTablistCustomEvent } from '@designsystem-se/af';

export interface Tab {
  id: string;
  title: string;
  badgeValue?: string | number;
  icon?: string;
  ariaLabel?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-tabs',
  standalone: true,
  imports: [DigiTablist, DigiTablistPanel],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TabsComponent {
  tabs = input<Tab[]>([]);
  activeTabId = input<string>('');
  shouldStretch = input<boolean>(false);

  tabChanged = output<string>();

  tabsJson = computed(() => JSON.stringify(this.tabs()));

  isActive = (tabId: string) => this.activeTabId() === tabId;

  onTabClick(event: DigiTablistCustomEvent<Tab>): void {
    const tab = event.detail;

    if (tab.id !== this.activeTabId()) {
      this.tabChanged.emit(tab.id);
    }
  }
}
