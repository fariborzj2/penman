# Embed Plugin Examples

Example of configuring Penman Editor with the Embed Plugin:

```javascript
import penman from 'penman';

const editor = penman.init({
  selector: '#editor',
  plugins: ['embed', 'format', 'list'],
  toolbar: 'embed | bold italic'
});
```

Example raw embed code an end-user could paste:
```html
<iframe src="https://example.com/embed" width="100%" height="400"></iframe>
```