import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'joinFields', standalone: true })
export class JoinFieldsPipe implements PipeTransform {
  transform(value?: unknown, fields?: string[], itemSeparator = ', ', listSeparator = ' | '): string {
    if (!Array.isArray(value) || !fields?.length) return '';

    return value
      .map(item =>
        fields
          .map(field => item?.[field])
          .filter(value => value != null && value !== '')
          .join(itemSeparator)
      )
      .filter(value => value !== '')
      .join(listSeparator);
  }
}
