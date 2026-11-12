/** The website calls its own `/api`. The apps call the same routes on bankochow.com. */
export function apiUrl(path: string, native: boolean, origin = 'https://bankochow.com'): string {
  return native ? `${origin}${path}` : path
}
