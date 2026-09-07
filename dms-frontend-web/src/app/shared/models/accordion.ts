export type AccordionContentValue = string | number | Record<string, unknown>;
export type AccordionContent = Record<string, AccordionContentValue>;

export interface Accordion {
  title?: string;
  subtitle?: string;
  link?: boolean;
  status?: boolean;
  content: AccordionContent[];
}
