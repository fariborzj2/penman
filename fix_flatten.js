const fs = require('fs');

let content = fs.readFileSync('src/sanitization/Sanitizer.js', 'utf8');

// The DOMParser ALREADY handles <p><ul>...</ul></p> by natively closing the <p> and opening the <ul> as a sibling.
// The browser parser outputs `<p>A</p><ul><li>B</li></ul>C<p></p>`.
// So the issue of `elementsToUnwrap` triggering on paragraphs is because `root.querySelectorAll` finds the `<p>`, and if by any chance a block got inside it programmatically before parsing, it unwraps it.
// BUT because the browser natively ejects blocks from `<p>`, `querySelectorAll('p')` won't even find `<ul>` inside it after DOMParser, UNLESS our own unwrapping or manipulation forced it in.
// Let's modify `_flattenInvalidNesting` to ONLY target Headings. Headings DO allow block elements inside them in the browser parser (e.g., `<h3><div>Text</div></h3>` is preserved by DOMParser).
// Paragraphs do NOT preserve blocks inside them via DOMParser, so we don't need to try and unwrap blocks inside paragraphs.
// The `_wrapOrphanText` handles the orphaned 'C' in the `<p>A</p><ul><li>B</li></ul>C<p></p>` example natively.

const oldFunc = `  _flattenInvalidNesting(root) {
      // Headings cannot contain blocks.
      const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6, p');

      const elementsToUnwrap = [];

      headings.forEach(heading => {
          const isParagraph = heading.tagName.toLowerCase() === 'p';
          const walker = document.createTreeWalker(heading, NodeFilter.SHOW_ELEMENT);
          let node;
          while (node = walker.nextNode()) {
              const tag = node.tagName.toLowerCase();
              if (this.blockTags.has(tag)) {
                  // For headings, unwrap ALL inner blocks
                  if (!isParagraph) {
                      elementsToUnwrap.push(node);
                  } else {
                      // For paragraphs, unwrap inner blocks IF they are not br/img/etc (but they aren't in blockTags anyway)
                      // A paragraph shouldn't contain a div or ul.
                      elementsToUnwrap.push(node);
                  }
              }
          }
      });

      // Unwrap bottom-up to handle nested blocks safely
      elementsToUnwrap.reverse().forEach(el => {
          if (el.parentNode) {
             const parent = el.parentNode;
             while(el.firstChild) {
                 parent.insertBefore(el.firstChild, el);
             }
             parent.removeChild(el);
          }
      });
  }`;

const newFunc = `  _flattenInvalidNesting(root) {
      // Headings cannot contain block elements structurally
      const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');

      const elementsToUnwrap = [];

      headings.forEach(heading => {
          const walker = document.createTreeWalker(heading, NodeFilter.SHOW_ELEMENT);
          let node;
          while (node = walker.nextNode()) {
              const tag = node.tagName.toLowerCase();
              if (this.blockTags.has(tag)) {
                  elementsToUnwrap.push(node);
              }
          }
      });

      // Unwrap bottom-up to handle nested blocks safely
      elementsToUnwrap.reverse().forEach(el => {
          if (el.parentNode) {
             const parent = el.parentNode;
             while(el.firstChild) {
                 parent.insertBefore(el.firstChild, el);
             }
             parent.removeChild(el);
          }
      });
  }`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync('src/sanitization/Sanitizer.js', content);
