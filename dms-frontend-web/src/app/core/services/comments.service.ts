import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface NuxeoComment {
  'entity-type': 'comment';
  id?: string;
  parentId?: string;
  text: string;
  author?: string;
  creationDate?: string;
  modificationDate?: string;
  ancestorIds?: string[];
  entityId?: string | null;
  origin?: string | null;
  entity?: unknown;
  permissions?: string[];
  numberOfReplies?: number;
}

export interface NuxeoCommentList {
  'entity-type': 'comments';
  totalSize?: number;
  entries: NuxeoComment[];
}

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = '/nuxeo/api/v1';

  addComment(documentId: string, text: string, parentId?: string): Observable<NuxeoComment> {
    const payload: NuxeoComment = {
      'entity-type': 'comment',
      parentId: parentId ?? documentId,
      text,
    };

    return this.httpClient.post<NuxeoComment>(`${this.baseUrl}/id/${documentId}/@comment`, payload);
  }

  getComments(
    documentId: string,
    options?: { pageSize?: number; currentPageIndex?: number }
  ): Observable<NuxeoCommentList> {
    const params = new HttpParams({
      fromObject: {
        ...(options?.pageSize !== undefined ? { pageSize: options.pageSize } : {}),
        ...(options?.currentPageIndex !== undefined ? { currentPageIndex: options.currentPageIndex } : {}),
      },
    });

    return this.httpClient.get<NuxeoCommentList>(`${this.baseUrl}/id/${documentId}/@comment`, { params }).pipe(
      map(response => ({
        entries: response.entries ?? [],
        'entity-type': response['entity-type'] ?? 'comments',
        totalSize: response.totalSize,
      }))
    );
  }

  updateComment(commentId: string, parentId: string, text: string): Observable<NuxeoComment> {
    const payload: NuxeoComment = {
      'entity-type': 'comment',
      parentId,
      text,
    };

    return this.httpClient.put<NuxeoComment>(`${this.baseUrl}/id/${parentId}/@comment/${commentId}`, payload);
  }

  deleteComment(parentId: string, commentId: string) {
    return this.httpClient.delete<void>(`${this.baseUrl}/id/${parentId}/@comment/${commentId}`);
  }
}
