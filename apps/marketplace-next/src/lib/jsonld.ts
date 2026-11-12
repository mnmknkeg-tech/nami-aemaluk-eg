/**
 * Safely serialize structured data for a <script type="application/ld+json"> tag.
 *
 * JSON.stringify does not escape "</script>", so any merchant-controlled field
 * (product name, description, shop address…) containing `</script><script>…`
 * would break out of the tag and execute on a public page. Escaping "<" as
 * \u003c (and the U+2028/U+2029 line separators for good measure) keeps the
 * JSON valid — parsers read the exact same values — while making tag-breakout
 * impossible.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
