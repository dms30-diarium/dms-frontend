import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';

export const homeRedirectGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const role = auth.activeRole();
  if (!role) return router.parseUrl('/forbidden');

  const pathByRole: Partial<Record<string, string>> = {
    REGISTRATOR: 'registrar',
    CHEF: 'chef',
    HANDLAGGARE: 'handler',
    ADMIN: 'admin',
  };

  return router.parseUrl('/' + (pathByRole[role] ?? 'forbidden'));
};
