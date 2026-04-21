# DirectionPlugin Examples

## Enabling the plugin with default options

```js
penman.init({
    selector: '#editor',
    plugins: ['direction']
});
```

## Advanced Configuration

```js
penman.init({
  selector: '#editor',
  plugins: ['direction'],
  toolbar: 'dirrtl dirltr dirreset | bold italic ...',

  directionOptions: {
    auto: false,           // enable auto-detection (default: false)
    default: 'rtl',        // fallback direction for empty blocks
    toolbar: true,         // register RTL / LTR / Auto toolbar buttons

    detection: {
      strategy: 'first-strong',  // or 'ratio'
      sampleSize: 120,           // chars to sample (ratio strategy)
      rtlThreshold: 0.3,         // RTL ratio trigger (ratio strategy)
    },

    debounce: 150,               // ms delay on input events

    ignore: ['pre', 'code'],     // tag names that skip direction detection

    lock: {
      attribute: 'data-dir-lock',  // attribute name for manual lock
      persistOnEmpty: false,       // remove lock when block is emptied
    },
  },
});
```
