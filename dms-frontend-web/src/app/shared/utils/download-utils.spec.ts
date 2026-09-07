import { buildDownloadOptions, formatFileSize } from './download-utils';

describe('buildDownloadOptions', () => {
  it('returns an empty array when docId is falsy', () => {
    expect(buildDownloadOptions('')).toEqual([]);
  });

  it('builds rendition URLs for the given document id', () => {
    const options = buildDownloadOptions('doc-1');

    expect(options).toEqual([
      { label: 'Thumbnail', url: '/nuxeo/api/v1/repo/default/id/doc-1/@rendition/thumbnail' },
      { label: 'PDF', url: '/nuxeo/api/v1/repo/default/id/doc-1/@rendition/pdf' },
      { label: 'ZIP Export', url: '/nuxeo/api/v1/repo/default/id/doc-1/@rendition/zipExport' },
      { label: 'XML Export', url: '/nuxeo/api/v1/repo/default/id/doc-1/@rendition/xmlExport' },
    ]);
  });
});

describe('formatFileSize', () => {
  it('formats sizes under 1024 as bytes without decimals', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats sizes in the kilobyte range with two decimals when under 10', () => {
    expect(formatFileSize(2048)).toBe('2.00 KB');
  });

  it('formats kilobyte sizes of 10 or more without decimals', () => {
    expect(formatFileSize(15 * 1024)).toBe('15 KB');
  });

  it('formats sizes in the megabyte range', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
  });

  it('formats sizes in the gigabyte range', () => {
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });

  it('caps at the largest unit (GB) for very large sizes', () => {
    expect(formatFileSize(5 * 1024 * 1024 * 1024 * 1024)).toContain('GB');
  });
});
