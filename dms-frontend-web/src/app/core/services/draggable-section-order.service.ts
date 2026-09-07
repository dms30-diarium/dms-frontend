import { Injectable } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';

@Injectable({ providedIn: 'root' })
export class DraggableSectionOrderService {
  loadOrder<T extends string>(storageKey: string, defaultOrder: readonly T[]): T[] {
    const savedSectionOrder = localStorage.getItem(storageKey);

    if (!savedSectionOrder) {
      return [...defaultOrder];
    }

    const storedSections = savedSectionOrder
      .split(',')
      .filter((section): section is T => defaultOrder.includes(section as T));
    const missingSections = defaultOrder.filter(section => !storedSections.includes(section));

    return [...storedSections, ...missingSections];
  }

  saveOrder<T extends string>(storageKey: string, sectionOrder: readonly T[]): void {
    localStorage.setItem(storageKey, sectionOrder.join(','));
  }

  visibleSections<T extends string>(sectionOrder: readonly T[], isSectionVisible: (section: T) => boolean): T[] {
    return sectionOrder.filter(section => isSectionVisible(section));
  }

  reorderSections<T extends string>(
    sectionOrder: readonly T[],
    isSectionVisible: (section: T) => boolean,
    previousIndex: number,
    currentIndex: number
  ): T[] {
    const reorderedVisibleSections = sectionOrder.filter(section => isSectionVisible(section));
    moveItemInArray(reorderedVisibleSections, previousIndex, currentIndex);

    const nextSectionOrder = [...sectionOrder];
    let visibleSectionIndex = 0;

    sectionOrder.forEach((section, index) => {
      if (isSectionVisible(section)) {
        nextSectionOrder[index] = reorderedVisibleSections[visibleSectionIndex];
        visibleSectionIndex += 1;
      }
    });

    return nextSectionOrder;
  }
}
