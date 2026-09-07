export interface DownloadOption {
  label: string;
  url: string;
}

export const buildDownloadOptions = (docId: string): DownloadOption[] => {
  if (!docId) return [];

  return [
    { label: 'Thumbnail', url: `/nuxeo/api/v1/repo/default/id/${docId}/@rendition/thumbnail` },
    { label: 'PDF', url: `/nuxeo/api/v1/repo/default/id/${docId}/@rendition/pdf` },
    { label: 'ZIP Export', url: `/nuxeo/api/v1/repo/default/id/${docId}/@rendition/zipExport` },
    { label: 'XML Export', url: `/nuxeo/api/v1/repo/default/id/${docId}/@rendition/xmlExport` },
  ];
};

export function formatFileSize(length: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(length) / Math.log(1024)), units.length - 1);
  const size = length / Math.pow(1024, index);
  const formatted = size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(2);
  return `${formatted} ${units[index]}`;
}
