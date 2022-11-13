# Qwik Styled Vanilla-Extract ⚡️💅

This provides a [Styled-Components](https://styled-components.com/)-like (SC) API in Qwik, using [vanilla-extract](https://vanilla-extract.style/) (VE) and [stylis](https://stylis.js.org/).
This combination yields a type-checked 0-runtime CSS-in-TS project.

## Installation

Install the needed NPM modules; they can be dev dependencies because Qwik will bundle them correctly for client and server.

```sh
npm i -D qwik-styled-ve @vanilla-extract/css
```

Then, add the Vite plugin to your `vite.config.ts`, for example:

```js
import {defineConfig} from 'vite'
import {qwikVite} from '@builder.io/qwik/optimizer'
import {qwikCity} from '@builder.io/qwik-city/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
// ---------------- ADD THIS ----------------
import {qwikStyledVEPlugin} from 'qwik-styled-ve'

export default defineConfig(() => {
	const cfg = {
		build: {sourcemap: true},
		plugins: [
			qwikCity(),
			qwikVite(),
			tsconfigPaths(),
			// ---------------- ADD THIS ----------------
			// This has to come somewhere after qwikVite, or the exports break
			qwikStyledVEPlugin(),
		],
	}
	return cfg
})
```

## Usage

This library is complementary to VE, so head over to the [VE docs](https://vanilla-extract.style/documentation/getting-started#create-a-style) to learn the basics.

### styled

You use `styled` to create Qwik components that you can import. This uses the same configuration objects as the VE `style()` function:

header.css.ts:

```ts
import {style} from '@vanilla-extract/css'
import {styled} from 'qwik-styled-ve'

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
			<br />
			The classname it uses is {Header.className}.
		</Header>
	)
})
```

### css

There's also `css` template string helper to convert CSS syntax to VE syntax. You can use it anywhere that accepts VE style objects:

header.css.ts:

```ts
import {style} from '@vanilla-extract/css'
import {styled, css} from 'qwik-styled-ve'

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

## Migrating from Styled Components

Several features are not supported because they are impossible as 0-runtime, or don't make sense in Qwik.

### Function interpolation

Instead of embedding a function in your CSS like `` `color: ${p => p.error ? 'red':'black'}` ``, you should use extra classes, inline styles, CSS variables or a combination. Any option is easy to implement with Qwik.

```tsx
import {Text, showError} from './component.css'

// ... hasError is a boolean
// Object of classnames and booleans
<Text class={{[showError]: hasError}}>text</Text>
// Class string
<Text class={hasError && showError}>text</Text>
// Style object
<Text style={{color: hasError ? 'red' : 'black'}}>text</Text>
// CSS variable that you use in your CSS
<Text style={{"--text-color": hasError ? 'red' : 'black'}}>text</Text>
```

### Themes

Use CSS variables instead. They are supported in all relevant browsers.

### Extending a component

Instead of using an existing component to build on, compose the styles that VE generates:

```ts
import {style} from '@vanilla-extract/css'
import {styled, css} from 'qwik-styled-ve'

const button = style(
	css`
		text-size: 3em;
	`
)

export const RedButton = styled.button([
	button,
	css`
		background-color: red;
	`,
])
```

### Use `as` another tag, extending another component, adding props

Things like `const Foo = styled(Bar).as('ul').props(...)` make the API more complex and are not (yet) supported.

This library aims to stay lean, but if DX can be improved new features will be considered.
