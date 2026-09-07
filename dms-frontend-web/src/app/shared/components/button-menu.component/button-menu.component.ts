import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  signal,
  ViewChild,
} from '@angular/core';

import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { ImageButtonComponent } from '../image-button/image-button.component';
import { BackdropClickDirective } from '@app/shared/directives/backdrop-click.directive';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { AccordionComponent } from '../accordion/accordion.component';

export interface ActionButton {
  text: string;
  icon: string;
  click: () => void;
}

@Component({
  selector: 'nuxeo-button-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DigiArbetsformedlingenAngularModule, ImageButtonComponent, BackdropClickDirective, AccordionComponent],
  templateUrl: './button-menu.component.html',
})
export class ButtonMenuComponent implements AfterViewInit {
  //#region 🔹 Signals & Dependencies
  document = input<NuxeoDocument<object>>();
  buttons = input.required<ActionButton[]>();
  shouldShowAccordion = input<boolean>(false);
  shouldShowMerButton = input<boolean>(false);

  @ViewChild('buttonContainer') buttonContainer!: ElementRef<HTMLDivElement>;
  visibleButtons = signal<ActionButton[]>([]);
  hiddenButtons = signal<ActionButton[]>([]);
  menuOpen = signal(false);
  //#endregion

  //#region 🔹 Lifecycle Hooks
  constructor() {
    effect(() => {
      const currentButtons = this.buttons();
      this.visibleButtons.set(currentButtons ?? []);

      requestAnimationFrame(() => {
        if (this.buttonContainer?.nativeElement) {
          this.adjustButtons(this.buttonContainer.nativeElement);
        }
      });
    });
  }

  ngAfterViewInit() {
    this.setupResizeObserver();

    requestAnimationFrame(() => {
      if (this.buttonContainer?.nativeElement) {
        this.adjustButtons(this.buttonContainer.nativeElement);
      }
    });
  }
  //#endregion

  //#region 🔹 Layout & Resize Logic
  private setupResizeObserver() {
    const container = this.buttonContainer.nativeElement;
    const observer = new ResizeObserver(() => {
      this.adjustButtons(this.buttonContainer.nativeElement);
    });
    observer.observe(container);
  }

  adjustButtons(container: HTMLElement) {
    const allButtons = this.buttons();
    if (!allButtons?.length) return;

    const containerWidth = container.clientWidth;
    const gap = 8;
    const moreButton = 90;

    let totalWidth = moreButton + gap;
    const visible: ActionButton[] = [];
    const hidden: ActionButton[] = [];

    for (const btn of allButtons) {
      const pxPerChar = 7.86; // pixels per 1 character of text in the button
      const buttonWidth = 16 + 16 + 10 + btn.text.length * pxPerChar + 16; // padding + icon + gap + text + padding

      const totalWidthIfAdded = totalWidth + buttonWidth + gap;
      if (totalWidthIfAdded <= containerWidth) {
        visible.push(btn);
        totalWidth = totalWidthIfAdded;
      } else {
        hidden.push(btn);
      }
    }

    this.visibleButtons.set(visible);
    this.hiddenButtons.set(hidden);
  }

  //#endregion

  //#region 🔹 “More Menu” Logic
  toggleMoreMenu() {
    this.menuOpen.update(open => !open);
  }

  handleMenuClick(button: ActionButton | null) {
    if (!button) return;
    this.menuOpen.set(false);
    button.click();
  }
  //#endregion
}
