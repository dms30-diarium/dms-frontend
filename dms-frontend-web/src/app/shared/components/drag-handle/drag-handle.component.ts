import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-drag-handle',
  standalone: true,
  imports: [DragDropModule, DigiArbetsformedlingenAngularModule],
  template: `
    <button
      type="button"
      cdkDragHandle
      class="absolute top-4 right-4 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded border border-gray-200 bg-white text-slate-600 shadow-sm"
      title="Flytta sektion"
      aria-label="Flytta sektion">
      <digi-icon-table class="h-[16px] w-[16px]"></digi-icon-table>
    </button>
  `,
})
export class DragHandleComponent {}
