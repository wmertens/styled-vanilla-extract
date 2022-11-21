import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {endFileScope, setFileScope} from '@vanilla-extract/css/fileScope'
import {css} from './css'
import {style, styled} from './ve-style'
import {createVar} from '@vanilla-extract/css'

// Make VE happy about running in this file
beforeEach(() => setFileScope('src/testFile.css.ts', 'testPackage'))
afterEach(() => endFileScope())

describe('css', () => {
	it('should interpolate QSC', () => {
		const Tag0 = styled.div`
			border: solid black;
		`
		const Tag1 = styled.div([
			Tag0,
			css`
				color: red;
			`,
		])
		expect(Tag1.className).toMatchInlineSnapshot(
			'"testFile__fspbdo1 testFile__fspbdo0"'
		)
		const out = css`
			${Tag1} & {
				background-color: black;
			}
		`
		expect(out).toMatchInlineSnapshot(`
			{
			  "selectors": {
			    ".testFile__fspbdo1 &": {
			      "background-color": "black",
			    },
			  },
			}
		`)
	})

	it('should allow variables', () => {
		const myVar = createVar()
		const out = css`
			${myVar}: black;
			color: ${myVar};
		`
		expect(out).toMatchInlineSnapshot(`
			{
			  "--fspbdo0": "black",
			  "color": "var(--fspbdo0)",
			}
		`)
	})

	it('should interpolate classLists', () => {
		const n1 = style``
		const n2 = style([n1, {}])
		expect(css`
			${n1} {
				color: red;
			}
			${n2} {
				color: blue;
			}
		`).toMatchInlineSnapshot(`
			{
			  "selectors": {
			    ".testFile__fspbdo0": {
			      "color": "red",
			    },
			    ".testFile__fspbdo1": {
			      "color": "blue",
			    },
			  },
			}
		`)
	})
})
