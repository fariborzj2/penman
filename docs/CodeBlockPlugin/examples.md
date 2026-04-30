# CodeBlock Plugin Examples

### JavaScript Example
```javascript
function hello() {
  console.log("Hello Penman!");
}
```

### HTML Example
```html
<div class="penman-editor">
  <p>Rich text content</p>
</div>
```

### CSS Example
```css
.hljs-keyword {
  color: #569cd6;
  font-weight: bold;
}
```

### Toggling Behavior
- **Before**: `<p>console.log("test")</p>` (Selected)
- **Action**: Click Code Block
- **After**: `<pre dir="ltr"><code><span class="hljs-variable language_">console</span>.<span class="hljs-title function_">log</span>(<span class="hljs-string">"test"</span>)</code></pre>`
