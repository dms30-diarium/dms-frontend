/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

if (typeof document !== 'undefined') {
  const existing = document.querySelector('link[data-designsystem="true"]');
  if (!existing) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'designsystem.css';
    link.setAttribute('data-designsystem', 'true');
    document.head.appendChild(link);
  }
}

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
