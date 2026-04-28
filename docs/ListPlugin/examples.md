# ListPlugin Examples

## Enabling the plugin

```js
penman.init({
    selector: '#editor',
    plugins: ['list']
});
```

## Creating a nested list

1.  Type "Item 1" and press Enter.
2.  Type "Item 2" and press Enter.
3.  Type "Sub-item A".
4.  Press the **Indent List** button in the toolbar (or press `Tab`).
5.  "Sub-item A" is now nested under "Item 2".

## Outdenting an item

1.  Place the cursor in a nested list item.
2.  Press the **Outdent List** button in the toolbar (or press `Shift+Tab`).
3.  The item moves one level up in the list hierarchy.
