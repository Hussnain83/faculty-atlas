/**
 * Only allow redirects to paths inside this app. Browsers read "//x" and "/\x" as another site,
 * so a second slash or any backslash or whitespace is refused. Anything unsafe becomes "/".
 */
export function safeNext(next: string): string {
  return /^\/(?![/\\])[^\s\\]*$/.test(next) ? next : "/";
}
