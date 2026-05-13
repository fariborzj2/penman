/**
 * Type definitions for Penman Editor.
 *
 * The published `penman-editor` package ships these types alongside the
 * compiled bundles so consumers in TypeScript projects get autocomplete and
 * compile-time safety on the public API.
 */

export interface BlockTypeOption {
  /** Display name shown in the block-type dropdown. */
  name: string;
  /** Lowercase tag name applied via `document.execCommand('formatBlock', cmd)`. */
  cmd: string;
  /** Optional CSS class applied to the formatted block. */
  class?: string;
  /** Optional i18n key used in place of `name` when an I18n manager is active. */
  i18nKey?: string;
  /** Optional inline-style overrides applied to the block element. */
  optionStyle?: Record<string, string>;
}

export interface EditorOptions {
  /** CSS selector pointing at a `<textarea>` element (required when `element` is not given). */
  selector?: string;
  /** Direct reference to the `<textarea>` element. Overrides `selector`. */
  element?: HTMLTextAreaElement;
  /** Toolbar configuration string (space/pipe-separated command names). */
  toolbar?: string;
  /** Plugin instances or factory functions to register. */
  plugins?: unknown[];
  /** Override of the default block-types list. */
  blockTypes?: BlockTypeOption[];
  /** Locale identifier for built-in strings. Defaults to `'en'`. */
  lang?: string;
  /** Initial text direction. Defaults to `'auto'`. */
  direction?: 'auto' | 'ltr' | 'rtl';
  /** Visible height of the editing area in pixels. Defaults to 300. */
  height?: number;
  /** Enable diagnostic console output through the internal logger. */
  debug?: boolean;
  /** Override the ARIA label applied to the contenteditable region. */
  ariaLabel?: string;
  /** Per-element configuration callback. */
  resolveConfig?: (el: Element, defaultConfig: EditorOptions) => EditorOptions;
  /** Arbitrary additional options consumed by plugins. */
  [key: string]: unknown;
}

export interface Editor {
  /** The underlying textarea element. */
  readonly textarea: HTMLTextAreaElement;
  /** The contenteditable region rendered by the editor. */
  readonly editableArea: HTMLElement;
  /** Editor options as resolved at construction time. */
  readonly options: EditorOptions;
  /** Returns sanitized HTML with internal editor attributes stripped. */
  getContent(): string;
  /** Replaces the editor content. Input is sanitized first. */
  setContent(html: string): void;
  /** Inserts HTML at the current selection. */
  insertContent(html: string): void;
  /** Moves keyboard focus to the editing area. */
  focus(): void;
  /** Executes a registered command with optional arguments. */
  execCommand(command: string, ...args: unknown[]): unknown;
  /** Subscribes to an editor event. */
  on(event: string, handler: (...args: unknown[]) => void): void;
  /** Removes a previously subscribed event handler. */
  off(event: string, handler: (...args: unknown[]) => void): void;
  /** Emits an editor event. */
  emit(event: string, ...args: unknown[]): void;
  /** Fully tears down the editor, removing all listeners and DOM nodes. */
  destroy(): void;
}

export interface PenmanAPI {
  /** Initialise one or more editors. Returns the instance (single match) or an array. */
  init(options: EditorOptions): Editor | Editor[];
  /** Retrieve an instance by selector or id. */
  get(selector: string): Editor | null;
  /** Retrieve an instance by its underlying `<textarea>` element. */
  getByElement(el: HTMLTextAreaElement): Editor | null;
  /** Retrieve an instance by its textarea `name` attribute. */
  getByName(name: string): Editor | null;
  /** Return every initialized editor. */
  getAll(): Editor[];
  /** Remove an instance from the registry. Accepts a selector, element, or Editor. */
  remove(identifier: string | HTMLElement | Editor): void;
  /** Plugin registration helper. */
  PluginManager: unknown;
  /** Default configuration object. */
  defaults: EditorOptions;
}

declare const penman: PenmanAPI;
export default penman;

/** Default options exported separately for convenience. */
export const penmanDefaults: EditorOptions;
