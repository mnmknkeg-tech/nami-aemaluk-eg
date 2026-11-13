/**
 * Features that are not part of the first public release (loyalty, gift cards,
 * layaway, …) stay visible on local/dev machines only — production builds
 * never render them.
 */
export const SHOW_UNPUBLISHED = process.env.NODE_ENV !== 'production';
