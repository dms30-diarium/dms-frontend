import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanMatchFn = route => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowed = route.data?.['roles'] ?? [];
  const userRoles = auth.roles();
  const isAdmin = auth.isAdmin();

  const hasAccess = isAdmin || allowed.length === 0 || userRoles.some(role => allowed.includes(role));

  return hasAccess ? true : router.parseUrl('/forbidden');
};
