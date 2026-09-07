import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';

import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { NotificationComponent } from './shared/components/notification/notification.component';
import { GeneralStore } from './core/services/general-store.service';
import { AuthService } from './core/services/auth.service';
import { filter } from 'rxjs';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-root',
  templateUrl: './app.component.html',
  standalone: true,
  styleUrls: ['./app.component.css'],
  imports: [
    RouterModule,
    SidebarComponent,
    NavbarComponent,
    DigiArbetsformedlingenAngularModule,
    NotificationComponent,
    OverlayModule,
  ],
})
export class AppComponent implements OnInit {
  isSidebarOpen = false;

  private auth = inject(AuthService);
  user = this.auth.user;
  store = inject(GeneralStore);
  router = inject(Router);

  @ViewChild('main', { static: true })
  main!: ElementRef<HTMLElement>;

  ngOnInit() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.main.nativeElement.scrollTop = 0;
    });
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
