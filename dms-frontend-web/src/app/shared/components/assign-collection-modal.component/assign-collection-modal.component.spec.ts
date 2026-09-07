import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AssignCollectionModalComponent } from './assign-collection-modal.component';

describe('AssignCollectionModalComponent', () => {
  let component: AssignCollectionModalComponent;
  let fixture: ComponentFixture<AssignCollectionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignCollectionModalComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(AssignCollectionModalComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(AssignCollectionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
