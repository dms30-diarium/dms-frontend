import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { RoleSwitcherComponent } from './role-switcher.component';
import { AuthService } from '@app/core/services/auth.service';

function makeAuthMock() {
  return {
    roles: signal(['HANDLAGGARE', 'REGISTRATOR']),
    activeRole: signal('HANDLAGGARE'),
    setActiveRole: jasmine.createSpy('setActiveRole'),
  };
}

describe('RoleSwitcherComponent', () => {
  let component: RoleSwitcherComponent;
  let fixture: ComponentFixture<RoleSwitcherComponent>;
  let authMock: ReturnType<typeof makeAuthMock>;

  beforeEach(async () => {
    authMock = makeAuthMock();

    await TestBed.configureTestingModule({
      imports: [RoleSwitcherComponent],
      providers: [{ provide: AuthService, useValue: authMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the available roles and active role from AuthService', () => {
    expect(component.roles()).toEqual(['HANDLAGGARE', 'REGISTRATOR']);
    expect(component.active()).toBe('HANDLAGGARE');
  });

  describe('onChange', () => {
    it('delegates to AuthService.setActiveRole', () => {
      component.onChange('REGISTRATOR');
      expect(authMock.setActiveRole).toHaveBeenCalledWith('REGISTRATOR');
    });
  });
});
