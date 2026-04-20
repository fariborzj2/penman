# DirectionPlugin Usage

## UI Integration
When `toolbar` option is true, the following buttons are automatically registered and can be added to the toolbar configuration:

*   `dirrtl`: Manually force the current block's direction to RTL and lock it.
*   `dirltr`: Manually force the current block's direction to LTR and lock it.
*   `dirreset`: Reset the current block's direction to automatic mode (removes the lock).

```js
penman.init({
    selector: '#editor',
    plugins: ['direction'],
    toolbar: 'bold italic | dirrtl dirltr dirreset'
});
```

## API Usage
You can programmatically control text direction using the `editor.direction` API:

```js
const editor = penman.get('#editor');

// Force the block at cursor to be RTL
editor.direction.set('rtl');

// Remove manual overrides and revert to auto-detection
editor.direction.reset();

// Manually trigger a rescan of the entire document
editor.direction.refresh();

// Detect direction of a given text string
const detectedDir = editor.direction.detect('متن فارسی'); // returns 'rtl'
```
