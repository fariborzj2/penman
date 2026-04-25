# Media Plugin Examples

## Basic Integration
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="penman.css">
</head>
<body>
  <textarea id="myEditor"></textarea>
  <script src="penman.js"></script>
  <script>
    penman.init({
      selector: '#myEditor',
      plugins: ['media'],
      toolbar: 'bold italic | media'
    });
  </script>
</body>
</html>
```

## Programmatic API Example
If needed, developers can insert media via the exposed API:
```javascript
const editor = penman.get('#myEditor');

editor.media.insertURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
// Internally triggers detection, extraction, and rendering
```