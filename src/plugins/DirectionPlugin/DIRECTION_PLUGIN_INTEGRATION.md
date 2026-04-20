# DirectionPlugin — Integration Guide

## 1. Copy Files

Place the `DirectionPlugin/` folder at:

```
src/plugins/DirectionPlugin/
```

## 2. Register in PluginManager

Add two lines to `src/plugins/PluginManager.js`:

```js
// At the top imports:
import { setupDirectionPlugin } from './DirectionPlugin/index.js';

// Inside the plugins map:
plugins: {
  // ... existing plugins ...
  direction: setupDirectionPlugin,
},
```

## 3. Initialize

```js
penman.init({
  selector: '#editor',
  plugins: ['direction'],
  toolbar: 'dirrtl dirltr dirreset | bold italic ...',

  directionOptions: {
    auto: true,            // enable auto-detection (default: true)
    default: 'rtl',        // fallback direction for empty blocks
    toolbar: true,         // register RTL / LTR / Auto toolbar buttons

    detection: {
      strategy: 'first-strong', // or 'ratio'
      sampleSize: 120,           // chars to sample (ratio strategy)
      rtlThreshold: 0.3,         // RTL ratio trigger (ratio strategy)
    },

    debounce: 150,               // ms delay on input events

    ignore: ['pre', 'code'],     // tag names that skip direction detection

    lock: {
      attribute: 'data-dir-lock',  // attribute name for manual lock
      persistOnEmpty: false,        // remove lock when block is emptied
    },
  },
});
```

## 4. Toolbar Buttons

| Button key  | Label    | Behaviour                                        |
|-------------|----------|--------------------------------------------------|
| `dirrtl`    | RTL      | Force current block RTL + lock it                |
| `dirltr`    | LTR      | Force current block LTR + lock it                |
| `dirreset`  | Dir Auto | Remove lock, immediately re-run auto-detection   |

## 5. Public API

```js
const editor = penman.get('#editor');

editor.direction.set('rtl');    // force current block RTL (locks it)
editor.direction.set('ltr');    // force current block LTR (locks it)
editor.direction.reset();       // unlock + re-detect current block
editor.direction.refresh();     // re-scan entire editable area
editor.direction.detect(text);  // returns 'rtl' or 'ltr' for a string
```

## 6. Commands

```js
editor.execCommand('SET_DIR_RTL');
editor.execCommand('SET_DIR_LTR');
editor.execCommand('RESET_DIR');
```
