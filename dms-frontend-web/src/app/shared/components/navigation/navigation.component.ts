import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';

import { ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { concatMap, EMPTY, filter, from, map, merge, of, switchMap, tap } from 'rxjs';
import { NavigationTreeComponent } from '@app/shared/components/nav-tree/nav-tree.component';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

export interface NavPath {
  title: string;
  uid: string;
  children: NavPath[];
  hasChildren: boolean;
  type?: string;
}

@Component({
  selector: 'nuxeo-navigation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    ReactiveFormsModule,
    DigiArbetsformedlingenAngularModule,
    NavigationTreeComponent,
  ],
  templateUrl: './navigation.component.html',
})
export class NavigationComponent implements OnInit {
  readonly router = inject(Router);
  readonly nuxeoApi = inject(NuxeoApiService);

  rootNode = signal<NavPath | null>(null);
  ancestors = signal<NuxeoDocument[]>([]);
  lastChild: NavPath | null = null;

  ngOnInit(): void {
    this.nuxeoApi
      .getPathInfo('/')
      .pipe(
        switchMap(path => {
          this.rootNode.set({
            title: path.type,
            uid: path.uid,
            hasChildren: path.contextParameters?.hasFolderishChild ?? false,
            children: [],
          });
          return this.nuxeoApi.getEntriesForParentPath(path.uid);
        }),
        tap(data => {
          const rootNode = this.rootNode();
          if (rootNode) {
            this.rootNode.set({
              ...rootNode,
              children: data.entries.map(el => ({
                title: el.title ?? '',
                hasChildren: el.contextParameters?.hasFolderishChild ?? false,
                uid: el.uid,
                type: el.type,
                children: [],
              })),
            });
          }
        })
      )
      .subscribe();
    const url$ = merge(
      of(this.router.url),
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(event => event.urlAfterRedirects)
      )
    );

    url$
      .pipe(
        switchMap(url => {
          const segments = url.split('/');
          if (!(segments[1] === 'doc' || segments[1] === 'folder')) {
            return EMPTY;
          }
          const id = segments[2];
          return id ? this.nuxeoApi.getAncestorsById(id) : EMPTY;
        }),
        tap(ancestors => this.ancestors.set(ancestors)),
        concatMap(ancestors => from(ancestors)),
        concatMap(ancestor => {
          const rootNode = this.rootNode();
          if (!rootNode) return EMPTY;
          if (!this.lastChild) {
            this.lastChild = rootNode;
            return this.showChildren(rootNode);
          }
          const child = this.lastChild?.children?.find(c => c.uid === ancestor.uid);
          if (child) {
            this.lastChild = child;
            return this.showChildren(child);
          }
          return EMPTY;
        })
      )
      .subscribe();
  }

  handleLoadChildren(currentPath: NavPath) {
    this.showChildren(currentPath).subscribe();
  }

  showChildren(currentPath: NavPath) {
    return this.nuxeoApi.getEntriesForParentPath(currentPath.uid).pipe(
      tap(data => {
        const children = data.entries.map(el => ({
          title: el.title,
          hasChildren: el.contextParameters?.hasFolderishChild ?? false,
          uid: el.uid,
          type: el.type,
          children: [],
        }));
        currentPath.children = children;

        this.rootNode.set({ ...this.rootNode()! });
      })
    );
  }
}
