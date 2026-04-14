import { describe, it, expect } from 'vitest';
import { GallerySystem } from './GallerySystem.js';
import { TrustLevel } from '../security/urlValidator.js';
import { GalleryState } from './GallerySource.js';

describe('GallerySystem Core Laws', () => {
  it('enforces Trust Immutability Rule regardless of payload', async () => {
    const system = new GallerySystem();

    const source = system.registerSource({
      id: 'test-source',
      trustLevel: TrustLevel.TRUSTED,
      list: async () => ({
        items: [
          { url: 'https://example.com/1.png', id: '1', trustLevel: 'UNTRUSTED' } // Payload tries to downgrade
        ]
      }),
      get: async () => ({ url: 'https://example.com/1.png', trustLevel: 'UNTRUSTED' }) // Payload tries to downgrade
    });

    await source.init();

    expect(source.state).toBe(GalleryState.READY);

    const response = await source.list();
    expect(response.items[0].trustLevel).toBe(TrustLevel.TRUSTED); // Enforced from registry

    const item = await source.get('1');
    expect(item.trustLevel).toBe(TrustLevel.TRUSTED); // Enforced from registry
  });
});
