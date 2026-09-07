import { Directive, Input, TemplateRef, ViewContainerRef, inject, signal, effect } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { AppRole } from '../models/roles';

@Directive({ selector: '[nuxeoHasRole]', standalone: true })
export class HasRoleDirective {
  private auth = inject(AuthService);
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);

  private requiredSig = signal<AppRole[]>([]);
  private rendered = false;

  @Input()
  set nuxeoHasRole(value: AppRole | AppRole[]) {
    this.requiredSig.set(Array.isArray(value) ? value : [value]);
  }

  private _ = effect(() => {
    const active = this.auth.activeRole();
    const required = this.requiredSig();
    const ok = !!active && required.includes(active);

    if (ok && !this.rendered) {
      this.vcr.createEmbeddedView(this.tpl);
      this.rendered = true;
    } else if (!ok && this.rendered) {
      this.vcr.clear();
      this.rendered = false;
    }
  });
}
