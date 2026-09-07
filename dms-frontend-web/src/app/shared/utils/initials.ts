export const getInitials = (name?: string): string => {
  if (!name) return '•';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '•';
  const initials = parts
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
  return initials || '•';
};
