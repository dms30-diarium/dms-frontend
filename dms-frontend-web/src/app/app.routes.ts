import { Routes } from '@angular/router';

import { roleGuard } from './core/guards/role.guard';
import { HistoryGuard } from './core/guards/history-guard.guard';

// Required only if using component-based routes instead of lazy `loadComponent`
import { ForbiddenComponent } from './shared/components/forbidden/forbidden.component';

export const routes: Routes = [
  // Role-based guarded routes for different roles
  {
    path: 'registrar',
    loadComponent: () => import('./pages/start-page/start-page.component').then(m => m.StartPageComponent),
    canMatch: [roleGuard],
    data: { roles: ['REGISTRATOR'] },
  },
  {
    path: 'chef',
    loadComponent: () => import('./pages/start-page/start-page.component').then(m => m.StartPageComponent),
    canMatch: [roleGuard],
    data: { roles: ['CHEF'] },
  },
  {
    path: 'handler',
    loadComponent: () => import('./pages/start-page/start-page.component').then(m => m.StartPageComponent),
    canMatch: [roleGuard],
    data: { roles: ['HANDLAGGARE'] },
  },

  // Document search and view
  {
    path: 'search',
    loadComponent: () =>
      import('./pages/document-search/document-search.component').then(m => m.DocumentSearchComponent),
    title: 'Document Search',
  },
  {
    path: 'favorites',
    loadComponent: () => import('./pages/favorites/favorites.component').then(m => m.FavoritesComponent),
    title: 'Favorites',
  },
  {
    path: 'admin/anvandare-grupper',
    loadComponent: () => import('./pages/admin/user-groups/user-groups.component').then(m => m.UserGroupsComponent),
    canMatch: [roleGuard],
    data: { roles: ['ADMIN'] },
    title: 'Användare & Grupper',
  },
  {
    path: 'admin/anvandare-grupper/users/:userId',
    loadComponent: () => import('./pages/admin/user-detail/user-detail.component').then(m => m.UserDetailComponent),
    canMatch: [roleGuard],
    data: { roles: ['ADMIN'] },
    title: 'User Details',
  },
  {
    path: 'admin/anvandare-grupper/:groupId',
    loadComponent: () => import('./pages/admin/group-detail/group-detail.component').then(m => m.GroupDetailComponent),
    canMatch: [roleGuard],
    data: { roles: ['ADMIN'] },
    title: 'Group Details',
  },
  {
    path: 'personal',
    loadComponent: () => import('./pages/personal-space/personal-space.component').then(m => m.PersonalSpaceComponent),
    title: 'Personlig yta',
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/rapporter/rapporter.component').then(m => m.RapporterComponent),
    title: 'Rapporter',
  },
  {
    path: 'statistics',
    loadComponent: () => import('./pages/statistics/statistics.component').then(m => m.StatisticsComponent),
    title: 'Statistik',
  },
  {
    path: 'admin/audit-logg',
    loadComponent: () => import('./pages/admin/audit/audit.component').then(m => m.AuditComponent),
    canMatch: [roleGuard],
    data: { roles: ['ADMIN'] },
    title: 'Audit logg',
  },
  {
    path: 'admin/vokabular',
    loadComponent: () => import('./pages/admin/vocabularies/vocabularies.component').then(m => m.VocabulariesComponent),
    canMatch: [roleGuard],
    data: { roles: ['ADMIN'] },
    title: 'Vokabulär',
  },
  {
    path: 'deletedFiles',
    loadComponent: () => import('./pages/deleted-files/deleted-files.component').then(m => m.DeletedFielsComponent),
    title: 'Deleted Files',
  },
  {
    path: 'recent',
    loadComponent: () => import('./pages/recent-viewed/recent-viewed.component').then(m => m.RecentViewedComponent),
    title: 'Recent',
  },
  {
    path: 'collections',
    loadComponent: () =>
      import('./pages/collections/collection-page/collection-page.component').then(m => m.CollectionPageComponent),
    title: 'Collections',
  },
  {
    path: 'collections/:id',
    loadComponent: () =>
      import('./pages/collections/collection-details-page/collection-details-page.component').then(
        m => m.CollectionDetailsPageComponent
      ),
    title: 'CollectionsDetails',
  },
  {
    path: 'folder/:id',
    loadComponent: () => import('./pages/folder-page/folder-page.component').then(m => m.FolderPageComponent),
    canActivate: [HistoryGuard],
  },
  {
    path: 'doc/:id',
    loadComponent: () => import('./pages/document-page/document-page.component').then(m => m.DocumentPageComponent),
    canActivate: [HistoryGuard],
  },
  {
    path: '',
    loadComponent: () => import('./pages/start-page/start-page.component').then(m => m.StartPageComponent),
  },

  {
    path: 'forbidden',
    component: ForbiddenComponent,
    title: 'Access denied',
  },

  {
    path: '**',
    redirectTo: '',
  },
];
