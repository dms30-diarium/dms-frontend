import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { TooltipDirective } from './tooltip.directive';

@Component({
  standalone: true,
  imports: [TooltipDirective, OverlayModule],
  template: ` <button id="trigger" [nuxeoTooltipDirective]="tooltipText">Hover me</button> `,
})
class HostComponent {
  tooltipText = 'Helpful hint';
}

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, OverlayModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('attaches the tooltip overlay on mouseenter and detaches it on mouseleave', () => {
    const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLElement;

    expect(() => trigger.dispatchEvent(new MouseEvent('mouseenter'))).not.toThrow();
    expect(document.querySelector('.cdk-overlay-container')?.textContent).toContain('Helpful hint');

    expect(() => trigger.dispatchEvent(new MouseEvent('mouseleave'))).not.toThrow();
  });

  it('hides the tooltip on click as well', () => {
    const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLElement;
    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    expect(() => trigger.dispatchEvent(new MouseEvent('click'))).not.toThrow();
  });
});
