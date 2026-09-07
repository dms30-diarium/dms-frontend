import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TableColOptionsComponent } from './table-col-options.component';

describe('TableColOptionsComponent', () => {
  let component: TableColOptionsComponent;
  let fixture: ComponentFixture<TableColOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableColOptionsComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(TableColOptionsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(TableColOptionsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
