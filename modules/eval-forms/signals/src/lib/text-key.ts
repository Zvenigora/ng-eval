import { createMetadataKey } from '@angular/forms/signals';

/**
 * The metadata key `evalText` writes through and a consumer reads back
 * (plan S 1.2.8, S 3.5).
 *
 * `text` has no dedicated primitive in `@angular/forms/signals` the way
 * `hidden` and `disabled` do, so it is `metadata(path, TEXT, logic)` against a
 * key created once - which is Angular's own mechanism rather than a second one
 * beside it, per the `/signals` reviewer checklist's item 4.
 *
 * **Created once, at module scope, deliberately.** `createMetadataKey` mints a
 * fresh key per call, and the write and the read-back have to name the same
 * object: a key re-created per access would let `metadata(p.x, TEXT, …)` write
 * under one identity and `f.x().metadata(TEXT)` read under another, and the
 * read would be `undefined` with nothing to show why. `text-key.spec.ts`
 * asserts the two halves of that - `createMetadataKey` is per-call, and this
 * is one of its results rather than the function itself.
 */
export const TEXT = createMetadataKey<string>();
