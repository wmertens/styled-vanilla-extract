# Changes

## v0.5.3

- Support @keyframes inside css
- Use only `class` attribute and rely on Qwik's merging
- deprecate `.className` on styled component

## v0.3.0

- Optionally provide the CSS as a default export when one exists
- Renamed vite plugin back to vanillaExtractPlugin
- moved vite plugin to /vite, so that the build doesn't interfere with client builds

## v0.2.0

- Now supports \`\` directly on `` style`...` `` and `` styled`...` ``, instead of having to use `` css`...` ``
- Vite plugin is now re-exported to allow ease of installation and later changes if needed
- Added tests and playground

## v0.1.0

Initial release
