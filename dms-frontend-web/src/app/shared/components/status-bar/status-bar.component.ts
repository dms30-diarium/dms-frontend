import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { DigiProgressIndicator } from '@designsystem-se/af-angular';
import { NgClass } from '@angular/common';
import { LifecycleHistoryResponse } from '@app/pages/case-page/case-types';
import { Option } from '@app/shared/commonTypes';
import { getCaseStateMeta } from '@app/shared/utils/case-state-utils';

@Component({
  selector: 'nuxeo-status-bar',
  imports: [DigiProgressIndicator, NgClass],
  templateUrl: './status-bar.component.html',
  styleUrl: './status-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBarComponent {
  private readonly el = inject(ElementRef);

  states = input.required<Option[]>();
  history = input<LifecycleHistoryResponse | null>(null);

  currentState = computed(() => this.history()?.currentState ?? '');

  private stateMeta = computed(() => getCaseStateMeta(this.states(), this.currentState()));
  completedSteps = computed(() => this.stateMeta().completedSteps);
  isClosed = computed(() => this.stateMeta().isClosed);

  private skippedIndices = computed(() => {
    const steps = this.completedSteps();
    const h = this.history();
    const skipped = new Set<number>();
    if (!h?.history.length) return skipped;
    const explicitlySkipped = new Set(h.history.filter(item => !item.reached).map(item => item.state.trim()));
    this.states().forEach((state, i) => {
      if (i + 1 <= steps && explicitlySkipped.has(state.id)) {
        skipped.add(i);
      }
    });
    return skipped;
  });

  constructor() {
    afterRenderEffect(() => {
      const skipped = this.skippedIndices();
      // Stencil renders its internals asynchronously; defer until after it stamps the DOM
      requestAnimationFrame(() => {
        const stepEls = this.el.nativeElement.querySelectorAll('.digi-progress-indicator__step');
        stepEls.forEach((step: Element, i: number) => {
          const el = step as HTMLElement;
          if (skipped.has(i)) {
            // Make skipped steps look like untouched future steps (dashed, no fill)
            el.style.setProperty('--digi--progress-indicator--step--line--style', 'dashed');
            el.style.setProperty('--digi--progress-indicator--step--background--active', 'transparent');
            el.style.setProperty('--digi--progress-indicator--step--background', 'transparent');
            el.style.setProperty(
              '--digi--progress-indicator--border-color--active',
              'var(--digi--color--border--neutral-5)'
            );
            el.style.setProperty('--digi--progress-indicator--border-color', 'var(--digi--color--border--neutral-5)');
          } else {
            el.style.removeProperty('--digi--progress-indicator--step--line--style');
            el.style.removeProperty('--digi--progress-indicator--step--background--active');
            el.style.removeProperty('--digi--progress-indicator--step--background');
            el.style.removeProperty('--digi--progress-indicator--border-color--active');
            el.style.removeProperty('--digi--progress-indicator--border-color');
          }
        });
      });
    });
  }
}
