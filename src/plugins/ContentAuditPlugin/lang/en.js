// src/plugins/ContentAuditPlugin/lang/en.js
// English strings for ContentAuditPlugin. Registered under namespace "plugins.audit".
export default {
  "title": "Content Audit",
  "fix": "Fix",
  "autoFix": "Auto-fix",
  "allClear": "No issues found",
  "allClearDesc": "Your content passes every check. Keep writing.",
  "scoreAria": "Score {score} of 100",
  "severity": {
    "critical": "Critical",
    "warning": "Warning",
    "suggestion": "Suggestion",
    "passed": "Passed"
  },
  "quality": {
    "excellent": "Excellent",
    "good": "Good",
    "fair": "Fair",
    "weak": "Weak",
    "poor": "Poor"
  },
  "categories": {
    "seo": "SEO",
    "accessibility": "Accessibility",
    "readability": "Readability",
    "structure": "Structure",
    "media": "Media",
    "links": "Links",
    "performance": "Performance",
    "html": "HTML Quality",
    "security": "Security"
  },
  "stats": {
    "words": "Words",
    "readTime": "Read time",
    "readMinutes": "{count} min",
    "headings": "Headings",
    "images": "Images",
    "internalLinks": "Internal links",
    "externalLinks": "External links",
    "issues": "Issues",
    "warnings": "Warnings"
  },
  "loc": {
    "topOfDoc": "Top of document",
    "headingN": "{level} #{n}: \"{text}\"",
    "charsCount": "{tag} ({count} chars)",
    "empty": "No content",
    "wordsTotal": "{count} words total",
    "wordsNoImages": "{count} words, 0 images",
    "paragraphQuote": "Paragraph: \"{text}\"",
    "imageN": "Image #{n}: {src}",
    "imageOnly": "Image #{n}",
    "iframeN": "iframe #{n}",
    "linkN": "Link #{n}: {href}",
    "linkText": "Link #{n}: \"{text}\"",
    "buttonN": "Button #{n}",
    "tagN": "<{tag}> #{n}",
    "paragraphWords": "Paragraph #{n} ({count} words)",
    "longSentences": "{count} long sentence(s)",
    "wordsNoHeadings": "{count} words, 0 headings",
    "noLists": "No <ul> or <ol> in the document",
    "repeatedWord": "Repeated: \"{word}\"",
    "wordDensity": "\"{word}\" used {count} times ({pct}%)",
    "headingSkip": "{text} (jumps from H{from} to H{to})",
    "emptyHeading": "Empty {tag}",
    "duplicateHeading": "Duplicate of \"{text}\"",
    "duplicateAlt": "Duplicate alt: \"{alt}\"",
    "url": "{url}",
    "weakAnchor": "\"{text}\" → {href}",
    "duplicateLink": "\"{text}\" duplicated",
    "brokenLink": "Broken: {url}",
    "urlWithStatus": "{url} ({status})",
    "imagesOnPage": "{count} images on the page",
    "htmlRatio": "{pct}% text-to-HTML ratio",
    "inlineStyleCount": "{count} elements with inline style",
    "nestedSameTag": "<{tag}> nested in <{tag}>",
    "tagWithAttrs": "<{tag} {attrs}>"
  },
  "linkCheck": {
    "checking": "Checking links… {done}/{total}"
  },
  "rules": {
    "seo-no-h1": {
      "title": "No H1 heading",
      "desc": "There is no top-level heading defining the page topic.",
      "why": "Search engines and screen readers rely on an H1 to understand what the page is about.",
      "fix": "Add an H1 at the start of your content describing the main topic."
    },
    "seo-multiple-h1": {
      "title": "Multiple H1 headings",
      "desc": "A page should have exactly one H1.",
      "why": "Multiple H1s dilute the topic signal for search engines.",
      "fix": "Convert additional H1s to H2 or H3 where appropriate."
    },
    "seo-h1-too-long": {
      "title": "H1 is too long",
      "desc": "H1 headings should be concise (under 70 characters).",
      "why": "Long H1s are truncated in search results and hurt scannability.",
      "fix": "Trim the H1 to its most essential phrase."
    },
    "seo-content-empty": {
      "title": "Content is empty",
      "desc": "The editor has no text to analyze.",
      "why": "Without content there is nothing for readers or search engines to value, so quality is treated as zero.",
      "fix": "Add meaningful, on-topic content to the document."
    },
    "seo-content-too-short": {
      "title": "Content is too short",
      "desc": "The document has fewer than 100 words.",
      "why": "Thin content rarely ranks well and tends to be flagged as low-value.",
      "fix": "Aim for at least 300 words of substantive content per page."
    },
    "seo-no-images": {
      "title": "No images in long content",
      "desc": "Long articles benefit from supporting imagery.",
      "why": "Images improve dwell time and topical relevance signals.",
      "fix": "Add at least one relevant image to articles longer than 500 words."
    },
    "seo-placeholder-text": {
      "title": "Placeholder text detected",
      "desc": "Content contains lorem ipsum or TODO markers.",
      "why": "Publishing placeholder text damages trust and SEO.",
      "fix": "Replace placeholder text with real content before publishing."
    },
    "a11y-img-missing-alt": {
      "title": "Image without alt text",
      "desc": "Image is missing the alt attribute entirely.",
      "why": "Screen readers cannot announce an image with no alt. Decorative images should use alt=\"\".",
      "fix": "Add a descriptive alt attribute, or use alt=\"\" for decorative images."
    },
    "a11y-iframe-no-title": {
      "title": "iframe without title",
      "desc": "iframe is missing a descriptive title attribute.",
      "why": "Screen readers announce iframes by their title.",
      "fix": "Add a title attribute explaining what the iframe contains."
    },
    "a11y-empty-link": {
      "title": "Link with no accessible name",
      "desc": "A link has neither text nor an aria-label.",
      "why": "Links without text are unreachable for screen-reader users.",
      "fix": "Add visible link text or an aria-label."
    },
    "a11y-button-no-label": {
      "title": "Button without text",
      "desc": "A button element has no text and no aria-label.",
      "why": "Screen readers will announce an empty button with no purpose.",
      "fix": "Provide visible text or an aria-label on each button."
    },
    "a11y-input-no-label": {
      "title": "Form input without label",
      "desc": "An input lacks a connected <label> or aria-label.",
      "why": "Unlabeled inputs are inaccessible to screen-reader and voice-control users.",
      "fix": "Wrap inputs in a <label> or add aria-label / aria-labelledby."
    },
    "read-long-paragraph": {
      "title": "Very long paragraph",
      "desc": "Paragraph contains more than 150 words.",
      "why": "Long paragraphs are intimidating; readers skip them.",
      "fix": "Split into multiple paragraphs around natural pauses."
    },
    "read-long-sentence": {
      "title": "Very long sentence",
      "desc": "One or more sentences exceed 35 words.",
      "why": "Sentences over ~30 words become hard to follow.",
      "fix": "Split long sentences into shorter, focused statements."
    },
    "read-no-headings": {
      "title": "No subheadings in long content",
      "desc": "Long article (>400 words) without any headings.",
      "why": "Subheadings act as signposts, making content scannable.",
      "fix": "Break the article into sections with H2 or H3 subheadings."
    },
    "read-no-lists": {
      "title": "No lists in long content",
      "desc": "Document is long but contains no lists.",
      "why": "Lists improve scannability for sequential or enumerable information.",
      "fix": "Where you list items in prose, consider a real <ul> or <ol>."
    },
    "read-repeated-word": {
      "title": "Repeated word",
      "desc": "The same word appears two or more times in a row.",
      "why": "Repeated consecutive words are almost always a typo.",
      "fix": "Remove the duplicated word."
    },
    "read-keyword-density": {
      "title": "Possible keyword stuffing",
      "desc": "A single word makes up more than 6% of total text.",
      "why": "Excessive repetition reads awkwardly and risks SEO penalties.",
      "fix": "Use synonyms or rephrase passages where the keyword dominates."
    },
    "struct-heading-skip": {
      "title": "Heading level skipped",
      "desc": "Heading levels jump (e.g. H2 followed by H4) without an intermediate level.",
      "why": "Skipping levels disorients screen-reader navigation.",
      "fix": "Adjust heading levels to descend by one at a time."
    },
    "struct-empty-heading": {
      "title": "Empty heading",
      "desc": "Heading has no visible text.",
      "why": "Empty headings appear as silent gaps to screen readers.",
      "fix": "Remove the empty heading or add meaningful text."
    },
    "struct-duplicate-heading": {
      "title": "Duplicate heading text",
      "desc": "Two or more headings share identical text.",
      "why": "Duplicate headings reduce table-of-contents value.",
      "fix": "Differentiate headings so each section has a unique title."
    },
    "media-img-no-dimensions": {
      "title": "Image missing width/height",
      "desc": "Image has no explicit width and height attributes.",
      "why": "Without dimensions the browser reflows once the image loads, causing layout shift.",
      "fix": "Set width and height attributes that match the image's intrinsic size."
    },
    "media-img-no-lazy": {
      "title": "Image not lazy-loaded",
      "desc": "Image is missing loading=\"lazy\".",
      "why": "Lazy loading defers offscreen images, improving initial page performance.",
      "fix": "Add loading=\"lazy\" to images that aren't in the first viewport."
    },
    "media-duplicate-alt": {
      "title": "Duplicate image alt text",
      "desc": "Multiple images share the same alt text.",
      "why": "Duplicate alts confuse screen readers and may indicate copy-paste mistakes.",
      "fix": "Give each image a unique, descriptive alt."
    },
    "link-status-broken": {
      "title": "Broken link (HTTP {status})",
      "desc": "The target server responded with an HTTP error.",
      "why": "Broken links send users to error pages and hurt SEO.",
      "fix": "Verify the URL, fix the destination, or remove the link."
    },
    "link-status-timeout": {
      "title": "Link timed out",
      "desc": "The target server did not respond within the allowed time.",
      "why": "Slow or unreachable targets frustrate users and may signal an outage.",
      "fix": "Open the URL in a browser to confirm it works, or replace it with a faster mirror."
    },
    "link-status-network": {
      "title": "Link unreachable",
      "desc": "A network or CORS error prevented checking this URL.",
      "why": "Unreachable links may indicate offline servers or DNS issues.",
      "fix": "Verify the URL manually. If the server simply blocks CORS, this check cannot run; consider a server-side proxy."
    },
    "link-malformed": {
      "title": "Broken or malformed URL",
      "desc": "The link's href is not a valid URL (whitespace, broken scheme, invalid hostname, or trailing hyphen).",
      "why": "Malformed URLs send users to error pages, break SEO, and may bypass security filters.",
      "fix": "Repair the URL — remove whitespace, fix the scheme (http:// or https://), and ensure the domain is well-formed."
    },
    "link-empty-href": {
      "title": "Link with empty href",
      "desc": "Anchor has no href, or href is \"#\" alone.",
      "why": "These links go nowhere and confuse users.",
      "fix": "Add a meaningful href or convert to a <button>."
    },
    "link-http": {
      "title": "Insecure http:// link",
      "desc": "Link uses http instead of https.",
      "why": "HTTP traffic is unencrypted and may be blocked by modern browsers.",
      "fix": "Use https when available."
    },
    "link-weak-anchor": {
      "title": "Weak anchor text",
      "desc": "Link uses generic text like \"click here\" or \"read more\".",
      "why": "Descriptive anchors help SEO and screen-reader users who navigate by link.",
      "fix": "Replace the link text with a phrase that describes the destination."
    },
    "link-duplicate": {
      "title": "Duplicate links",
      "desc": "Two or more links share the same href and the same visible text.",
      "why": "Repeated links rarely add value and clutter the navigation.",
      "fix": "Keep one canonical link; remove duplicates."
    },
    "link-external-no-rel": {
      "title": "External link missing rel=\"noopener\"",
      "desc": "External link opens with target=\"_blank\" but no rel=\"noopener\".",
      "why": "Without rel=\"noopener\", target=\"_blank\" links expose your page to tab-napping.",
      "fix": "Add rel=\"noopener\" (or noopener noreferrer) to external _blank links."
    },
    "perf-large-images": {
      "title": "Many large images",
      "desc": "The page has more than 10 images.",
      "why": "Image-heavy pages take longer to load, especially on mobile networks.",
      "fix": "Use lazy loading, compress images, and consider responsive srcset."
    },
    "perf-html-bloat": {
      "title": "Low text-to-HTML ratio",
      "desc": "Less than 25% of the rendered bytes are visible text.",
      "why": "Excess markup slows parsing and increases payload size.",
      "fix": "Remove redundant wrappers, inline styles, and empty elements."
    },
    "html-empty-elements": {
      "title": "Empty elements",
      "desc": "Inline elements like <strong>, <em>, <span> exist with no content.",
      "why": "Empty inline elements add markup noise without affecting rendering.",
      "fix": "Remove empty inline elements during cleanup."
    },
    "html-excessive-inline-style": {
      "title": "Excessive inline styles",
      "desc": "Many elements use inline style attributes.",
      "why": "Inline styles are hard to maintain and override; prefer CSS classes.",
      "fix": "Move repeated inline styles into reusable CSS classes."
    },
    "html-nested-same-tag": {
      "title": "Nested identical inline tags",
      "desc": "A <strong> inside a <strong> (or em-in-em, etc.) does nothing.",
      "why": "Redundant nesting adds markup with no visual effect.",
      "fix": "Flatten nested duplicates."
    },
    "sec-inline-event": {
      "title": "Inline event handler attribute",
      "desc": "An element has an inline event handler (onclick, onerror, etc.).",
      "why": "Inline handlers are a frequent XSS vector and bypass CSP.",
      "fix": "Remove the handler — add behavior in JavaScript instead."
    },
    "sec-javascript-href": {
      "title": "javascript: link",
      "desc": "A link uses the javascript: scheme.",
      "why": "javascript: hrefs execute arbitrary code and are a common XSS pivot.",
      "fix": "Replace with a real URL or attach a JS handler."
    },
    "sec-iframe-unsafe-src": {
      "title": "iframe with non-https src",
      "desc": "iframe src is not over https.",
      "why": "Mixed content from http iframes is blocked by modern browsers and may be intercepted.",
      "fix": "Use the https variant of the embed URL."
    }
  }
};
