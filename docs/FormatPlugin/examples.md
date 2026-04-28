# FormatPlugin Examples

## Enabling the plugin

```js
penman.init({
    selector: '#editor',
    plugins: ['format'] // "format" is automatically included in most default setups
});
```

## Using Superscript and Subscript

To use superscript and subscript, you can either click the buttons in the toolbar (if available) or use the editor's command system:

```js
editor.commands.execute('superscript');
editor.commands.execute('subscript');
```
