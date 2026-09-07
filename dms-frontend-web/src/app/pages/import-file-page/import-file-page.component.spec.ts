import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ImportFilePageComponent } from './import-file-page.component';

describe('ImportFilePageComponent', () => {
  let component: ImportFilePageComponent;
  let fixture: ComponentFixture<ImportFilePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFilePageComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(ImportFilePageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ImportFilePageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
