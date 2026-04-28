# Paperclip Docs Release Deployment

This bundle was built for the public base path `/`.

## Routing model

- The app uses hash routing, so deep links look like `/#/installation`
- No server-side rewrite rules are required for route handling
- Serve the bundle root at `/`
- Keep all copied files together so requests for `content.json`, markdown files, images, fonts, and JS resolve normally

If `content.json` or linked markdown files are missing from the uploaded bundle, the docs app will fail to load content.

## GitHub Pages

- Publish the built bundle from a branch such as `gh-pages`
- Include a `.nojekyll` file in the published output
- Configure the Pages source branch in repository settings, or through the Pages REST API

## Other static hosts

The generated `.htaccess` and `nginx.conf.example` are optional examples for non-Pages hosting.
