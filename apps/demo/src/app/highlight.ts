import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';

// Registered once, here: the source view shows only `.ts` files.
hljs.registerLanguage('typescript', typescript);

/** The text as highlight.js's HTML: the text escaped, in spans that carry its classes. */
export function highlightTypeScript(text: string): string {
  return hljs.highlight(text, { language: 'typescript' }).value;
}
