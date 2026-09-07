import { Directive, ElementRef, Output, EventEmitter, HostListener, OnDestroy, inject } from '@angular/core';

@Directive({
  selector: '[nuxeoBackdropClick]',
})
export class BackdropClickDirective implements OnDestroy {
  @Output()
  public backdropClick = new EventEmitter<MouseEvent>();
  private elementRef = inject(ElementRef<HTMLElement>);
  private listening = true;

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (!this.listening) {
      return;
    }

    const target = event.target;

    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.backdropClick.emit(event);
    }
  }

  ngOnDestroy(): void {
    this.listening = false;
  }
}
