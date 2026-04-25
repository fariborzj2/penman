# Media Plugin Usage

## Initialization
To use the Media Plugin, include `media` in your plugins array during Editor initialization.

```javascript
import penman from 'penman';

const editor = penman.init({
  selector: '#editor',
  plugins: ['media'],
  toolbar: 'media' // adds the Insert Media button
});
```

## Supported Operations
- **Insert via UI**: Click the "Insert Media" button, paste a URL from YouTube, Aparat, or a whitelisted custom iframe.
- **Auto-detection**: The modal will automatically select the provider and format the embed URL.

## Configuration (Optional)
By default, the plugin enables YouTube and Aparat. You can whitelist additional domains:

```javascript
penman.init({
  plugins: ['media'],
  media: {
    whitelist: ['vimeo.com', 'dailymotion.com'] // Extends base whitelist
  }
});
```