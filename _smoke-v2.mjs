// Full set this time — try to invoke setup() for ALL plugins, even the heavy ones.
import { I18nManager } from './src/i18n/I18nManager.js';
import { IconProvider } from './src/ui/IconProvider.js';

const i18n = new I18nManager('fa');
const ip = new IconProvider();
const fakeEditor = {
  i18n, ui: { iconProvider: ip, registry: { addButton: () => {}, addDropdown: () => {} }, createModal: () => ({}) },
  commands: { register: () => {}, execute: () => {}, on: () => {}, off: () => {} },
  on: () => {}, off: () => {}, options: {},
  editableArea: { querySelectorAll: () => [], addEventListener: () => {}, removeEventListener: () => {} },
};

const plugins = [
  'LinkPlugin','FormatPlugin','BlockTypePlugin','ColorPlugin','DirectionPlugin',
  'EmbedPlugin','FindReplacePlugin','FontSizePlugin','HorizontalRulePlugin',
  'ListPlugin','RemoveFormatPlugin','SuggestedPostsPlugin','SourceCodePlugin',
  'DraftPlugin','ImagePlugin','MediaPlugin','TablePlugin','CodeBlockPlugin','ContentAuditPlugin',
];

function setupName(folder) {
  // setupXxxPlugin where Xxx = folder without trailing "Plugin"
  return 'setup' + folder;
}

for (const folder of plugins) {
  try {
    const mod = await import(`./src/plugins/${folder}/index.js`);
    const fn = mod[setupName(folder)];
    if (typeof fn !== 'function') {
      console.log(`SKIP  ${folder}: ${setupName(folder)} missing`);
      continue;
    }
    try { fn(fakeEditor); console.log(`RUN   ${folder}`); }
    catch (e) {
      // Setup ran (and at minimum the register() calls at the top did);
      // any further throw is from later side effects we don't model.
      console.log(`RUN*  ${folder} (setup threw later: ${e.message.split('\n')[0].slice(0,60)})`);
    }
  } catch (e) {
    console.log(`LOAD FAIL ${folder}: ${e.message.split('\n')[0]}`);
  }
}

const checks = [
  'plugins.blockType.heading1','plugins.codeBlock.title','plugins.color.textColor',
  'plugins.direction.rtl','plugins.draft.draftSaved','plugins.embed.title',
  'plugins.findReplace.title','plugins.fontSize.title','plugins.hr.title',
  'plugins.image.title','plugins.link.insert','plugins.list.bullet',
  'plugins.media.title','plugins.removeFormat.title','plugins.sourceCode.title',
  'plugins.suggestedPosts.title','plugins.table.title','plugins.audit.title',
  'core.bold','ui.cancel','ui.ok',
];
let pass = 0, fail = 0;
console.log('\n--- i18n resolution ---');
for (const k of checks) {
  const v = i18n.t(k);
  const ok = v !== k && v.length > 0;
  ok ? pass++ : fail++;
  console.log(`  ${ok?'OK ':'XX '} ${k.padEnd(36)} => "${v}"`);
}

const iconChecks = [
  'link','unlink','bold','italic','underline','strikethrough','superscript','subscript',
  'image','media','embed','bullist','numlist','indentlist','outdentlist','hr',
  'findreplace','removeformat','table','selecttable','textcolor','highlight',
  'dirrtl','dirltr','dirreset','codeblock','sourcecode','suggestedposts',
  'undo','redo','justifyleft','justifycenter','justifyright','justifyfull',
];
console.log('\n--- icon resolution ---');
for (const n of iconChecks) {
  const svg = ip.getIcon(n);
  const ok = svg.startsWith('<svg');
  ok ? pass++ : fail++;
  console.log(`  ${ok?'OK ':'XX '} ${n.padEnd(18)} => ${ok?'svg':'FALLBACK'}`);
}

console.log(`\nTotals: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
