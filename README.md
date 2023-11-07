# Styled Vanilla-Extract ⚡️💅

This provides a [Styled-Components](https://styled-components.com/)-like (SC) API for Qwik,
using [vanilla-extract](https://vanilla-extract.style/) (VE) and [stylis](https://stylis.js.org/).
This combination yields a type-checked 0-runtime CSS-in-TS project.

**Try it out now on 👉 [StackBlitz](https://stackblitz.com/edit/styled-vanilla-extract-playground) 👈.**

Example:

- styles.css.ts:

  ```tsx
  import {styled} from 'styled-vanilla-extract/qwik'

  export const RedText = styled.span`
    color: red;
  `
  ```

gets converted at build time to

- styles.css.ts.vanilla.css:

  ```css
  .werasf1 {
    color: red;
  }
  ```

- styles.css.ts.vanilla.js:

  ```js
  import './styles.css.ts.vanilla.css'
  import {styled as _spofw} from 'styled-vanilla-extract/qwik-styled'

  export var RedText = _spofw('span', 'werasf1')
  ```

`RedText` is a Qwik Lite component ready for use, and the CSS will be included by Qwik automatically.

Type-checking happens automatically thanks to the fact that the source file is a `.ts` file (you can use plain js too)
and all helpers have proper typing.

## Installation

### Automatically

Run `npx @builder.io/qwik add styled-vanilla-extract`.

### Manually

Install the needed NPM modules; they can be dev dependencies because Qwik will bundle them correctly for client and
server.

```sh
npm i -D styled-vanilla-extract @vanilla-extract/css
```

Then, add the Vite plugin to your `vite.config.ts`, for example:

```js
import {defineConfig} from 'vite'
import {qwikVite} from '@builder.io/qwik/optimizer'
import {qwikCity} from '@builder.io/qwik-city/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
// ---------------- ADD THIS ----------------
import {vanillaExtractPlugin} from 'styled-vanilla-extract/vite'

export default defineConfig(() => {
	const cfg = {
		build: {sourcemap: true},
		plugins: [
			qwikCity(),
			qwikVite(),
			tsconfigPaths(),
			// ---------------- ADD THIS ----------------
			// This has to come somewhere after qwikVite, or the exports break
			vanillaExtractPlugin(),
		],
	}
	return cfg
})
```

Then, check if your editor has styled-components support. For example, VS Code
has [vscode-styled-components](https://marketplace.visualstudio.com/items?itemName=styled-components.vscode-styled-components).

## Usage

This library is complementary to vanilla-extract, so head over to
the [vanilla-extract docs](https://vanilla-extract.style/documentation/getting-started#create-a-style) to learn the
basics.

### styled

You use `styled` to create Qwik components that you can import. This uses the same configuration objects as the
vanilla-extract `style()` function:

header.css.ts:

```ts
import {style, styled} from 'styled-vanilla-extract/qwik'

// Local classname that makes things fancy
export const fancy = style({})

// Header: a Qwik Lite Component
export const Header = styled.header({
	padding: '0.5em',
	border: 'thin solid var(--color-hint)',
	borderBottom: 'none',
	selectors: {
		[`${fancy} &, ${fancy}&`]: {
			background: 'gold',
		},
	},
})
```

header.tsx:

```tsx
import {Header, fancy} from './header.css'

export default component$(() => {
	// do header stuff
	return (
		<Header class={isFancy && fancy}>
			Header, possibly fancy.
			<br/>
			The classname it uses is {Header.class}.
		</Header>
	)
})
```

### css

There's also `css` template string helper to convert CSS syntax to vanilla-extract syntax. You can use it anywhere that
accepts vanilla-extract style objects:

header.css.ts:

```ts
import {style, styled, css} from 'styled-vanilla-extract/qwik'

// Local classname
export const fancy = style({})

// Header: a Qwik Lite Component
export const Header = styled.h1(css`
  padding: 0.5em;
  border: thin solid var(--color-hint);
  border-bottom: none;
  ${fancy} &, ${fancy}&: {
    background: gold;
  }
`)
```

### combined

Both `style` and `styled` can be used as tagged template functions, so the above can also be written as

header.css.ts:

```ts
import {style, styled} from 'styled-vanilla-extract/qwik'

export const Fancy = style``

// Header: a Qwik Lite Component
export const Header = styled.h1`
  padding: 0.5em;
  border: thin solid var(--color-hint);
  border-bottom: none;
  ${fancy} &, ${fancy}&: {
    background: gold;
  }
`
```

## Only emitting styles you use

By default, the CSS you create will be emitted in a .css file that your html will load.

You can instead get the CSS as a string that you then give to Qwik's `useStyles$()`. To do this, you must have a default
export in your definition:

header.css.ts:

```ts
import {styled} from 'styled-vanilla-extract/qwik'

// This will be replaced with the CSS
export default ''

// Header: a Qwik Lite Component
export const Header = styled.h1`
  padding: 0.5em;
  border: thin solid var(--color-hint);
  border-bottom: none;
`
```

Header.tsx:

```tsx
import {component$, useStyles$} from '@builder.io/qwik'
import style, {Header} from './header.css'

export default component$(() => {
	useStyles$(style)

	return <Header>I'm styled!</Header>
})
```

This has the advantage that your initial HTML includes only the styles you actually use, and they are inline, which
reduces lag.
If you are building a Single Page Application, this is most likely what you want.

## Notes

- All styles you create in a css.ts file are included in the CSS output. They do not get tree-shaken, unlike the
  exported identifiers. This is vanilla-extract behavior.
- Qwik doesn't do hot reloading at the moment. It also has problems with changing .css files. You might have to reload
  the page manually sometimes to get styles to apply.

## Migrating from Styled Components

Several features are not supported because they are impossible as 0-runtime, or don't make sense in Qwik.

### Replacing function interpolation

Instead of embedding a function in your CSS like `` `color: ${p => p.error ? 'red':'black'}` ``, you should use extra
classes, inline styles, CSS variables, or a combination thereof. Any option is easy to implement with Qwik.

```tsx
import {Text, showError} from './component.css'

// ... hasError is a boolean
// Object of classnames and booleans
<
Text

class

= {
{
	[showError]
:
	hasError
}
}>
text < /Text>
// Class string
<Text class={hasError && showError}>text</Text>
// Style object
<Text style={{color: hasError ? 'red' : 'black'}}>text</Text>
// CSS variable that you use in your CSS
<Text style={{"--color-hint": hasError ? 'red' : 'black'}}>text</Text>
```

### Replacing themes

Use CSS variables instead. They are supported in all relevant browsers.

You can also import any code you like to create the CSS at build time, there are no restrictions, go wild!

Vanilla-extract also has nice helper projects for this
purpose, [Sprinkles](https://vanilla-extract.style/documentation/packages/sprinkles/)
and [Recipes](https://vanilla-extract.style/documentation/packages/recipies/).

### Extending a component

A QwikStyledComponent can be passed to `style` and `styled` to
Instead of using an existing component to build on, compose the styles that vanilla-extract generates:

```ts
import {styled, css} from 'styled-vanilla-extract'

const Button = styled.button`
  text-size: 3em;
`

export const RedButton = styled.button([
	Button,
	css`
    background-color: red;
  `,
])
```

### Use `as` another tag, extending another component, adding props

Things like `const Foo = styled(Bar).as('ul').props(...)` make the API more complex and are not (yet) supported.

This library aims to stay lean, but if DX can be improved new features will be considered.
