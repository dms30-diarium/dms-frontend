import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SecretStampService {
  private readonly stampLabels: Record<string, string> = {
    svagSekretess: 'SVAG - SEKRETESS',
    starkSekretess: 'STARK - SEKRETESS',
  };

  getSecretStampText(secretId: string | null | undefined): string | null {
    if (!secretId) return null;
    return this.stampLabels[secretId] ?? null;
  }
}
