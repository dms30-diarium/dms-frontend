import { Directive, HostListener, ElementRef, OnInit, inject, input, ComponentRef } from '@angular/core';

import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { OverlayPositionBuilder } from '@angular/cdk/overlay';

import { TooltipComponent } from '../components/tooltip/tooltip.component';

@Directive({
  selector: '[nuxeoTooltipDirective]',
})
export class TooltipDirective implements OnInit {
  nuxeoTooltipDirective = input('');

  private overlayRef!: OverlayRef;
  private overlay = inject(Overlay);
  private elementRef = inject(ElementRef);
  private overlayPositionBuilder = inject(OverlayPositionBuilder);
  private instanceRef!: ComponentRef<TooltipComponent>;

  ngOnInit() {
    const positionStrategy = this.overlayPositionBuilder.flexibleConnectedTo(this.elementRef).withPositions([
      {
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom',
      },
    ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
    });
  }

  @HostListener('mouseenter')
  show() {
    const tooltipPortal = new ComponentPortal(TooltipComponent);

    this.instanceRef = this.overlayRef.attach(tooltipPortal);
    this.instanceRef.instance.text = this.nuxeoTooltipDirective();
    this.instanceRef.instance.class = 'opacity-100!';
  }

  @HostListener('mouseleave')
  @HostListener('click')
  hide() {
    this.instanceRef.instance.class = 'opacity-0';
    this.overlayRef.detach();
  }
}
