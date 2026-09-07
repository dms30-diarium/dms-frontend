import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CollectionDocumentCardComponent } from './collection-document-card.component';

describe('CollectionDocumentCardComponent', () => {
  let component: CollectionDocumentCardComponent;
  let fixture: ComponentFixture<CollectionDocumentCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionDocumentCardComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(CollectionDocumentCardComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CollectionDocumentCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
