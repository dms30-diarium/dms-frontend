import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DeletedFielsComponent } from './deleted-files.component';

describe('DeletedFielsComponent', () => {
  let component: DeletedFielsComponent;
  let fixture: ComponentFixture<DeletedFielsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeletedFielsComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(DeletedFielsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DeletedFielsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
