import { TestBed } from '@angular/core/testing';
import { RelativeTimeService } from './relative-time.service';

describe('RelativeTimeService', () => {
  let service: RelativeTimeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [RelativeTimeService] });
    service = TestBed.inject(RelativeTimeService);
  });

  it('returns empty string for null', () => {
    expect(service.formatRelativeTime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(service.formatRelativeTime(undefined)).toBe('');
  });

  it('returns empty string for invalid date string', () => {
    expect(service.formatRelativeTime('not-a-date')).toBe('');
  });

  it('returns "a few seconds ago" for very recent timestamp', () => {
    const recent = new Date(Date.now() - 5000).toISOString();
    expect(service.formatRelativeTime(recent)).toBe('a few seconds ago');
  });

  it('returns "a few seconds ago" for future timestamp', () => {
    const future = new Date(Date.now() + 10000).toISOString();
    expect(service.formatRelativeTime(future)).toBe('a few seconds ago');
  });

  it('returns minutes ago for 5 minutes ago', () => {
    const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(service.formatRelativeTime(fiveMin)).toBe('5 minutes ago');
  });

  it('returns "1 minute ago" for 1 minute', () => {
    const oneMin = new Date(Date.now() - 61 * 1000).toISOString();
    expect(service.formatRelativeTime(oneMin)).toBe('1 minute ago');
  });

  it('returns "an hour ago" for 61 minutes ago', () => {
    const oneHour = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    expect(service.formatRelativeTime(oneHour)).toBe('an hour ago');
  });

  it('returns hours ago for multiple hours', () => {
    const threeHours = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(service.formatRelativeTime(threeHours)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for 25 hours ago', () => {
    const oneDay = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(service.formatRelativeTime(oneDay)).toBe('1 day ago');
  });

  it('returns days ago for multiple days', () => {
    const threeDays = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(service.formatRelativeTime(threeDays)).toBe('3 days ago');
  });

  it('accepts a Date object', () => {
    const date = new Date(Date.now() - 61 * 1000);
    expect(service.formatRelativeTime(date)).toBe('1 minute ago');
  });
});
