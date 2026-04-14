const fs = require('fs');

const target = 'src/plugins/ImagePlugin/index.js';
let content = fs.readFileSync(target, 'utf8');

if (!content.includes('GallerySystem')) {
    content = "import { GallerySystem } from './gallery/index.js';\n" + content;

    // Create the gallery system instance and attach it
    content = content.replace(
        "editor.image = {",
        "const gallerySystem = new GallerySystem();\n\n  editor.image = {\n    gallery: gallerySystem,"
    );

    fs.writeFileSync(target, content, 'utf8');
    console.log('Patched ImagePlugin/index.js with GallerySystem');
}
