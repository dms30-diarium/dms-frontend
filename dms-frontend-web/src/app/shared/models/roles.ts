export type AppRole = 'REGISTRATOR' | 'CHEF' | 'HANDLAGGARE' | 'ADMIN' | 'ARKIVARIE';

export const GROUP_TO_ROLE: Record<string, AppRole> = {
  DMS_Registrator: 'REGISTRATOR',
  DMS_Granskare: 'CHEF',
  DMS_Handlaggare: 'HANDLAGGARE',
  DMS_Admin: 'ADMIN',
  DMS_Arkivarie: 'ARKIVARIE',
};
