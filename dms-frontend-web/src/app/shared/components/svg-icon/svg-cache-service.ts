import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SvgCacheService {
  private http = inject(HttpClient);

  private cache = new Map<string, Observable<string>>();

  getSvg(src: string): Observable<string> {
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    const request$ = this.http.get(src, { responseType: 'text' }).pipe(
      catchError(error => {
        this.cache.delete(src);
        return throwError(() => error);
      }),
      shareReplay(1)
    );

    this.cache.set(src, request$);
    return request$;
  }
}
