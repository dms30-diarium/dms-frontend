import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HistoryService } from '@services/history-service.service';

@Injectable({ providedIn: 'root' })
export class HistoryGuard implements CanActivate {
  private history = inject(HistoryService);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    this.history.addPage(state.url);
    return true;
  }
}
