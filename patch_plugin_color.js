const fs = require('fs');

const pluginFile = 'src/plugins/TablePlugin.js';
let content = fs.readFileSync(pluginFile, 'utf8');

// Inject import
content = content.replace("import { TableMenu } from './table/TableMenu.js';", "import { TableMenu } from './table/TableMenu.js';\nimport { ColorPicker } from '../ui/ColorPicker.js';");

// Replace the native input with a custom button that opens the Color Picker dropdown
const floatingButtonsRep = `
           <button type="button" class="penman-btn penman-btn-split-cell" title="Split Cell" style="padding: 4px; display:none; align-items:center; color: #111827;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M12 4v16"/><path d="M4 12h16"/></svg>
           </button>

           <div class="penman-btn-bg-color-wrapper" style="position:relative; display:flex;">
               <button type="button" class="penman-btn penman-btn-bg-color-trigger" title="Background Color" style="padding: 4px; display:flex; align-items:center; color: #111827;">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
               </button>
           </div>
`;

content = content.replace(/<button type="button" class="penman-btn penman-btn-split-cell"[\s\S]*?<\/button>[\s\S]*?<div class="penman-btn-bg-color-wrapper"[\s\S]*?<\/div>/m, floatingButtonsRep.trim());

// Update the event binding logic to mount the ColorPicker
const bindRep = `
     floatingUI.element.querySelector('.penman-btn-split-cell').addEventListener('mousedown', (e) => {
         e.preventDefault();
         editor.commands.execute('SPLIT_CELL');
     });

     const colorTrigger = floatingUI.element.querySelector('.penman-btn-bg-color-trigger');
     const colorWrapper = floatingUI.element.querySelector('.penman-btn-bg-color-wrapper');

     if (colorTrigger && colorWrapper) {
         let pickerInstance = null;

         colorTrigger.addEventListener('click', (e) => {
             e.preventDefault();
             // Toggle picker
             const existing = colorWrapper.querySelector('.penman-color-picker-container');
             if (existing) {
                 existing.remove();
                 return;
             }

             // Remove any other pickers first
             const oldPickers = document.querySelectorAll('.penman-color-picker-container');
             oldPickers.forEach(p => p.remove());

             const container = document.createElement('div');
             container.className = 'penman-color-picker-container';
             container.style.position = 'absolute';
             container.style.top = '100%';
             container.style.left = '0';
             container.style.zIndex = '9999';
             container.style.marginTop = '5px';

             pickerInstance = new ColorPicker({
                 defaultColor: '#ffffff',
                 onChange: (hex) => {
                     editor.commands.execute('SET_CELL_PROPERTY', { property: 'backgroundColor', value: hex });
                     container.remove();
                 }
             });

             container.appendChild(pickerInstance.getElement());
             colorWrapper.appendChild(container);

             // Close on outside click
             const closePicker = (ce) => {
                 if (!container.contains(ce.target) && ce.target !== colorTrigger) {
                     container.remove();
                     document.removeEventListener('mousedown', closePicker);
                 }
             };
             setTimeout(() => document.addEventListener('mousedown', closePicker), 10);
         });
     }
`;

content = content.replace(/floatingUI\.element\.querySelector\('\.penman-btn-split-cell'\)\.addEventListener\('mousedown', \(e\) => \{[\s\S]*?\}\);[\s\S]*?const colorPicker = floatingUI\.element\.querySelector\('\.penman-btn-bg-color-picker'\);[\s\S]*?if \(colorPicker\) \{[\s\S]*?colorPicker\.addEventListener\('change', \(e\) => \{[\s\S]*?editor\.commands\.execute\('SET_CELL_PROPERTY', \{ property: 'backgroundColor', value: e\.target\.value \}\);[\s\S]*?\}\);[\s\S]*?\}/m, bindRep.trim());


// Update updateFloatingUIButtons
content = content.replace(/const colorPicker = floatingUI\.element\.querySelector\('\.penman-btn-bg-color-picker'\);[\s\S]*?if \(colorPicker && anchorCell\) \{[\s\S]*?\}/m, "");

fs.writeFileSync(pluginFile, content);
