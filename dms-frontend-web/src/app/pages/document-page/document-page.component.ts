import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ArendeExtendedProperties, HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { CasePageComponent } from '../case-page/case-page.component';
import { switchMap, tap } from 'rxjs';
import { UtkastPageComponent } from '../utkast-page/utkast-page.component';
import { HandlingPageComponent } from '../handling-page/handling-page.component';
import { getPathByDocType } from '@app/shared/utils';
import { MailMessageComponent } from '../mail-message-page/mail-message.component';
import { ImportFilePageComponent } from '../import-file-page/import-file-page.component';
import { KlassPageComponent } from '../klass-page/klass-page.component';
import { BeslutstyperPageComponent } from '../information-management/beslutstyper-page/beslutstyper-page.component';
import { ChecklistaPageComponent } from '../checklista-page/checklista-page.component';
import { KlasstypPageComponent } from '../information-management/klasstyp-page/klasstyp-page.component';
import { DocumentPreviewComponent } from '../media-views/document-preview/document-preview.component';
import { FileViewComponent } from '../media-views/file-view/file-view.component';
import { PictureViewComponent } from '../media-views/picture-view/picture-view.component';
import { VideoViewComponent } from '../media-views/video-view/video-view.component';
import { ArendefasPageComponent } from '../information-management/arendefas-page/arendefas-page.component';
import { HandlingstypPageComponent } from '../handlingstyp-page/handlingstyp-page.component';
import { BeredningsbeslutPageComponent } from '../information-management/beredningsbeslut-page/beredningsbeslut-page.component';
import { LagrumPageComponent } from '../information-management/lagrum-page/lagrum-page.component';
import { HandlaggningsstatusPageComponent } from '../information-management/handlaggningsstatus-page/handlaggningsstatus-page.component';
import { ArkivPageComponent } from '../arkiv-page/arkiv-page.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-document-page',
  imports: [
    RouterModule,
    CasePageComponent,
    NgClass,
    UtkastPageComponent,
    HandlingPageComponent,
    MailMessageComponent,
    ImportFilePageComponent,
    KlassPageComponent,
    KlasstypPageComponent,
    BeslutstyperPageComponent,
    ChecklistaPageComponent,
    ArendefasPageComponent,
    HandlingstypPageComponent,
    BeredningsbeslutPageComponent,
    LagrumPageComponent,
    HandlaggningsstatusPageComponent,
    ArkivPageComponent,
    DocumentPreviewComponent,
    FileViewComponent,
    PictureViewComponent,
    VideoViewComponent,
  ],
  templateUrl: './document-page.component.html',
})
export class DocumentPageComponent {
  router = inject(Router);
  route = inject(ActivatedRoute);
  http: HttpClient = inject(HttpClient);
  sanitizer = inject(DomSanitizer);
  readonly nuxeoApi = inject(NuxeoApiService);
  safePreviewUrl: SafeResourceUrl | undefined;
  document = signal<NuxeoDocument | undefined>(undefined);
  constructor() {
    this.route.params
      .pipe(
        switchMap(params => {
          return this.nuxeoApi.getDocumentById(params['id'], true);
        }),
        tap(response => {
          this.document.set(response);
          const pathPart = getPathByDocType(this.document()!.type);
          if (pathPart !== '/doc/') {
            this.router.navigate([pathPart, this.document()!.uid], {
              queryParams: this.route.snapshot.queryParams,
            });
            return;
          }

          const previewUrl = this.document()!.contextParameters?.preview?.url;
          if (previewUrl) {
            this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl);
          }
        })
      )
      .subscribe();
  }

  reloadDocument() {
    if (this.document()?.uid) {
      this.nuxeoApi
        .getDocumentById(this.document()!.uid, true)
        .pipe(
          tap(result => {
            this.document.set(result);
          })
        )
        .subscribe();
    }
  }

  isArende(document: NuxeoDocument<object>): document is NuxeoDocument<ArendeExtendedProperties> {
    return document.type === 'Arende';
  }
  isHandling(document: NuxeoDocument<object>): document is NuxeoDocument<HandlingExtendedProperties> {
    return document.type === 'Handling';
  }
  isUtkast(document: NuxeoDocument<object>): document is NuxeoDocument<HandlingExtendedProperties> {
    return document.type === 'Utkast';
  }
}
