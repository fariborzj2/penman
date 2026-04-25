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
- **Insert via UI**: Click the "Insert Media" button. You can use the "Direct Link" tab for `.mp4`/`.mp3` files, or the "Embed / Services" tab to paste a URL from YouTube, Aparat, or a whitelisted custom iframe.
- **Auto-detection**: The modal will automatically select the provider and format the embed URL for supported services.
- **Editing Existing Media**: Select an existing media block in the editor and click the "Insert Media" button again to open the configuration modal in Edit mode. You can adjust URLs, titles, and other settings.

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