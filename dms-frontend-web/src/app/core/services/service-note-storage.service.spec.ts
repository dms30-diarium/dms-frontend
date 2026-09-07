import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ServiceNoteStorageService } from './service-note-storage.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuthService } from '@app/core/services/auth.service';

describe('ServiceNoteStorageService', () => {
  let service: ServiceNoteStorageService;

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    const authSpy = jasmine.createSpyObj('AuthService', ['username']);

    TestBed.configureTestingModule({
      providers: [
        ServiceNoteStorageService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    });

    service = TestBed.inject(ServiceNoteStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
