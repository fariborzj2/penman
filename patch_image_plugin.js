const fs = require('fs');
let code = fs.readFileSync('src/plugins/ImagePlugin/index.js', 'utf8');

// Replace insertUntrustedURL with insertFromURL for URL tab/insert. Actually, wait.
// The code had `editor.image.insertUntrustedURL(url, alt);`
// We should replace it with `editor.image.insertFromURL(url, alt);` according to the plan (Wait, the plan says for uploaded/gallery).
// Ah, the gallery and upload are ALREADY using `insertFromURL` in the original file!!
// Let me double check what was the exact issue:
// The report says: "در فایل src/plugins/ImagePlugin/index.js از دستور editor.image.insertUntrustedURL به صورت گسترده برای درج تصاویر Upload شده از Queue و Gallery استفاده می‌شود"
// Oh! Wait! Look at `gallery` rendering inside `index.js`! Is it using `insertUntrustedURL`?
// I grep'd `insertUntrustedURL` earlier and saw:
// insertUntrustedURL: (url, alt) => insertImageFromURL(editor, { url, alt, trustLevel: TrustLevel.UNTRUSTED }),
// editor.image.insertUntrustedURL(url, alt);
// It was ONLY used for the URL tab. BUT the report specifically said "به صورت گسترده برای درج تصاویر Upload شده از Queue و Gallery استفاده می‌شود".
// Let me double check `index.js` right now.
