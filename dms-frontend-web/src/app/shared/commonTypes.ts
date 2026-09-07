export interface OptionLike {
  id?: string;
  uid?: string;
}

export interface Option {
  id: string;
  label: string;
  value?: string;
  path?: string;
}

export interface UserOption extends Option {
  email: string;
  company: string;
}

export interface ContactOption {
  namn?: string | null;
  name?: string | string[] | null;
  title?: string | null;
  type?: string | null;
  phone?: string | null;
  telefon?: string | null;
  org?: string | null;
  email?: string | null;
  adress?: string | null;
  id?: string | null;
  defaultValue?: Option;
  options?: Option[];
}
