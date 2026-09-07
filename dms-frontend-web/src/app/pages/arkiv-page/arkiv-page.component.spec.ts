import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ArkivPageComponent } from './arkiv-page.component';

describe('ArkivPageComponent', () => {
  let component: ArkivPageComponent;
  let fixture: ComponentFixture<ArkivPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArkivPageComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(ArkivPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ArkivPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
