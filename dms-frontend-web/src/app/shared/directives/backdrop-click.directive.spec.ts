import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackdropClickDirective } from './backdrop-click.directive';

@Component({
  standalone: true,
  imports: [BackdropClickDirective],
  template: `
    <div id="outside">Outside</div>
    <div id="inside" nuxeoBackdropClick (backdropClick)="onBackdropClick($event)">Inside</div>
  `,
})
class HostComponent {
  emitted: MouseEvent | null = null;
  onBackdropClick(event: MouseEvent): void {
    this.emitted = event;
  }
}

describe('BackdropClickDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(host).toBeTruthy();
  });

  it('emits backdropClick when a click occurs outside the host element', () => {
    const outside = fixture.nativeElement.querySelector('#outside') as HTMLElement;
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(host.emitted).not.toBeNull();
  });

  it('does not emit backdropClick when a click occurs inside the host element', () => {
    const inside = fixture.nativeElement.querySelector('#inside') as HTMLElement;
    inside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(host.emitted).toBeNull();
  });

  it('stops emitting after the directive is destroyed', () => {
    fixture.destroy();
    const outside = document.querySelector('#outside') as HTMLElement | null;
    if (outside) {
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    expect(host.emitted).toBeNull();
  });
});
