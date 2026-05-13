// Full simulation of editor init: register every plugin's lang/icons via
// PluginManager and verify strings + icons resolve everywhere.
import { I18nManager } from './src/i18n/I18nManager.js';
import { IconProvider } from './src/ui/IconProvider.js';

const i18n = new I18nManager('fa');
const ip = new IconProvider();
const fakeEditor = {
  i18n, ui: { iconProvider: ip, registry: { addButton: () => {}, addDropdown: () => {} }, createModal: () => ({}) },
  commands: { register: () => {}, execute: () => {} },
  on: () => {}, options: {},
};

const plugins = [
  ['LinkPlugin', 'setupLinkPlugin'],
  ['FormatPlugin', 'setupFormatPlugin'],
  ['BlockTypePlugin', 'setupBlockTypePlugin'],
  ['ColorPlugin', 'setupColorPlugin'],
  ['DirectionPlugin', 'setupDirectionPlugin'],
  ['EmbedPlugin', 'setupEmbedPlugin'],
  ['FindReplacePlugin', 'setupFindReplacePlugin'],
  ['FontSizePlugin', 'setupFontSizePlugin'],
  ['HorizontalRulePlugin', 'setupHorizontalRulePlugin'],
  ['ListPlugin', 'setupListPlugin'],
  ['RemoveFormatPlugin', 'setupRemoveFormatPlugin'],
  ['SuggestedPostsPlugin', 'setupSuggestedPostsPlugin'],
  ['SourceCodePlugin', 'setupSourceCodePlugin'],
  ['DraftPlugin', 'setupDraftPlugin'],
];
for (const [folder, fnName] of plugins) {
  try {
    let mod;
    try { mod = await import(`./src/plugins/${folder}/index.js`); }
    catch { mod = await import(`./src/plugins/${folder}/${folder}.js`); }
    const fn = mod[fnName];
    if (typeof fn === 'function') { try { fn(fakeEditor); } catch {} }
  } catch (e) { console.log(`LOAD FAIL ${folder}: ${e.message}`); }
}

// --- Verify a random sampling of plugin strings resolve ---
const checks = [
  // From every migrated plugin
  ['plugins.blockType.heading1',        'heading h1'],
  ['plugins.codeBlock.title',           'codeblock'],
  ['plugins.color.textColor',           'color text'],
  ['plugins.direction.rtl',             'direction rtl'],
  ['plugins.draft.draftSaved',          'draft saved'],
  ['plugins.embed.title',               'embed'],
  ['plugins.findReplace.title',         'find/replace'],
  ['plugins.fontSize.title',            'font size'],
  ['plugins.hr.title',                  'hr'],
  ['plugins.image.title',               'image'],
  ['plugins.link.insert',               'link insert'],
  ['plugins.list.bullet',               'bullet'],
  ['plugins.media.title',               'media'],
  ['plugins.removeFormat.title',        'remove format'],
  ['plugins.sourceCode.title',          'source code'],
  ['plugins.suggestedPosts.title',      'suggested'],
  ['plugins.table.title',               'table'],
  // Core (still in central locales)
  ['core.bold',                         'core bold'],
  ['ui.cancel',                         'ui cancel'],
  ['ui.ok',                             'ui ok'],
];

let allPass = true;
console.log('--- i18n resolution ---');
for (const [key, label] of checks) {
  const got = i18n.t(key);
  const pass = got !== key && typeof got === 'string' && got.length > 0;
  if (!pass) allPass = false;
  console.log(`  ${pass ? 'OK ' : 'XX '} ${key.padEnd(36)} (${label}) => "${got}"`);
}

console.log('\n--- icon resolution ---');
const iconChecks = [
  // Plugin icons
  'link', 'unlink', 'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript',
  'image', 'media', 'embed', 'bullist', 'numlist', 'indentlist', 'outdentlist',
  'hr', 'findreplace', 'removeformat', 'table', 'selecttable', 'textcolor', 'highlight',
  'dirrtl', 'dirltr', 'dirreset', 'codeblock', 'sourcecode', 'suggestedposts',
  // Core icons
  'undo', 'redo', 'justifyleft', 'justifycenter', 'justifyright', 'justifyfull',
];
for (const name of iconChecks) {
  const svg = ip.getIcon(name);
  const isSvg = svg.startsWith('<svg');
  if (!isSvg) allPass = false;
  console.log(`  ${isSvg ? 'OK ' : 'XX '} ${name.padEnd(20)} => ${isSvg ? 'svg' : 'FALLBACK'}`);
}

console.log(allPass ? '\n=== ALL CHECKS PASSED ===' : '\n=== SOME CHECKS FAILED ===');
process.exit(allPass ? 0 : 1);
