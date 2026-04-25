import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityValidation } from './security/SecurityValidation.js';
import { ProviderRegistry } from './core/ProviderRegistry.js';
import { YoutubeProvider } from './providers/YoutubeProvider.js';
import { AparatProvider } from './providers/AparatProvider.js';
import { createCustomProvider } from './providers/CustomProvider.js';
import { MediaRenderer } from './rendering/MediaRenderer.js';

describe('MediaPlugin Architecture Tests', () => {

  describe('SecurityValidation', () => {
    it('whitelists default providers', () => {
      const validator = new SecurityValidation();
      expect(validator.isWhitelisted('https://youtube.com/watch?v=123')).toBe(true);
      expect(validator.isWhitelisted('https://www.aparat.com/v/123')).toBe(true);
      expect(validator.isWhitelisted('https://youtu.be/123')).toBe(true);
    });

    it('rejects unwhitelisted domains', () => {
      const validator = new SecurityValidation();
      expect(validator.isWhitelisted('https://malicious.com/embed')).toBe(false);
    });

    it('sanitizes dangerous protocols', () => {
      const validator = new SecurityValidation();
      expect(validator.sanitizeURL('javascript:alert(1)')).toBe('');
      expect(validator.sanitizeURL('data:text/html,<html>')).toBe('');
      expect(validator.sanitizeURL('https://youtube.com/test')).toBe('https://youtube.com/test');
    });
  });

  describe('ProviderRegistry', () => {
    let registry;
    beforeEach(() => {
      registry = new ProviderRegistry();
      registry.register(YoutubeProvider);
      registry.register(AparatProvider);
    });

    it('matches youtube provider', () => {
      const provider = registry.match('https://youtube.com/watch?v=dQw4w9WgXcQ');
      expect(provider).toBeDefined();
      expect(provider.name).toBe('youtube');
    });

    it('extracts and processes youtube properly', () => {
      const data = registry.process('https://youtube.com/watch?v=dQw4w9WgXcQ');
      expect(data).toBeDefined();
      expect(data.provider).toBe('youtube');
      expect(data.id).toBe('dQw4w9WgXcQ');
      expect(data.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('extracts and processes aparat properly', () => {
      const data = registry.process('https://www.aparat.com/v/abcdef123');
      expect(data).toBeDefined();
      expect(data.provider).toBe('aparat');
      expect(data.id).toBe('abcdef123');
      expect(data.embedUrl).toBe('https://www.aparat.com/video/video/embed/videohash/abcdef123/vt/frame');
    });
  });

  describe('CustomProvider', () => {
    it('accepts whitelisted custom URLs', () => {
      const validator = new SecurityValidation({ whitelist: ['custom.com'] });
      const customProvider = createCustomProvider(validator);

      const isDetected = customProvider.detect('https://custom.com/myembed');
      expect(isDetected).toBe(true);

      const data = customProvider.extract('https://custom.com/myembed');
      expect(data.url).toBe('https://custom.com/myembed');
    });

    it('rejects non-whitelisted custom URLs', () => {
      const validator = new SecurityValidation({ whitelist: ['custom.com'] });
      const customProvider = createCustomProvider(validator);

      const isDetected = customProvider.detect('https://unknown.com/myembed');
      expect(isDetected).toBe(false);
    });
  });

  describe('MediaRenderer', () => {
    it('renders a block figure with contenteditable=false', () => {
      // Setup minimal DOM for MediaRenderer.render execution
      const JSDOM = require('jsdom').JSDOM;
      const dom = new JSDOM();
      global.document = dom.window.document;

      const data = {
        id: 'test-id',
        provider: 'youtube',
        kind: 'video',
        src: 'https://youtube.com/watch',
        embedUrl: 'https://youtube.com/embed/test'
      };

      const el = MediaRenderer.render(data);
      expect(el.tagName).toBe('FIGURE');
      expect(el.getAttribute('contenteditable')).toBe('false');
      expect(el.classList.contains('penman-media')).toBe(true);
      expect(el.dataset.mediaId).toBe('test-id');

      const iframe = el.querySelector('iframe');
      expect(iframe).toBeDefined();
      expect(iframe.getAttribute('src')).toBe('https://youtube.com/embed/test');
      expect(iframe.getAttribute('loading')).toBe('lazy');

      delete global.document;
    });
  });

});
