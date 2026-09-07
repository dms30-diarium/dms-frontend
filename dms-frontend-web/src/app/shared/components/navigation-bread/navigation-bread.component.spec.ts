import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NavigationBreadComponent } from './navigation-bread.component';

describe('NavigationBreadComponent', () => {
  let component: NavigationBreadComponent;
  let fixture: ComponentFixture<NavigationBreadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationBreadComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(NavigationBreadComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(NavigationBreadComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
