/**
 * CloudFront viewer-request function for PR environments (pr-environment.sh).
 * Rewrites SPA routes under /pr-<id>/ to /pr-<id>/index.html so client-side
 * routing works when requesting paths like /pr-42/dashboard directly.
 * Leaves paths with file extensions unchanged (e.g. /pr-42/assets/main.js).
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Match /pr-<digits> or /pr-<digits>/ or /pr-<digits>/subpath
  var prMatch = uri.match(/^(\/pr-\d+)(?:\/(.*))?$/);
  if (prMatch) {
    var prefix = prMatch[1];
    var subpath = prMatch[2];

    // Rewrite when: no subpath, empty subpath, or subpath has no file extension
    var hasExtension = subpath && /\.([a-zA-Z0-9]+)$/.test(subpath);
    if (!hasExtension) {
      request.uri = prefix + "/index.html";
    }
  }

  return request;
}
