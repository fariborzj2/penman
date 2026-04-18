const { JSDOM } = require('jsdom');
const dom = new JSDOM('<h3><div class="message-container"><div class="mat-typography markdown typography"><p>Hello</p></div></div></h3>');
const h3 = dom.window.document.querySelector('h3');
console.log(h3.outerHTML);

function flattenBlocks(root, domWindow) {
    const blockTags = new Set([
      "p", "div", "ul", "ol", "li", "blockquote",
      "figure", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
      "caption", "figcaption"
    ]);

    const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const h of headings) {
        let hasBlock = false;
        // Check if heading has block children
        const walker = domWindow.document.createTreeWalker(h, domWindow.NodeFilter.SHOW_ELEMENT);
        let node;
        let blocksToUnwrap = [];
        while (node = walker.nextNode()) {
            if (blockTags.has(node.tagName.toLowerCase())) {
                blocksToUnwrap.push(node);
            }
        }

        // Unwrap blocks bottom-up or just unwrap them iteratively
        while (blocksToUnwrap.length > 0) {
            const block = blocksToUnwrap.pop();
            const parent = block.parentNode;
            while(block.firstChild) {
                parent.insertBefore(block.firstChild, block);
            }
            parent.removeChild(block);
        }
    }
}
flattenBlocks(dom.window.document.body, dom.window);
console.log(dom.window.document.body.innerHTML);
