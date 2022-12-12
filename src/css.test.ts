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
		expect(Tag1.class).toMatchInlineSnapshot(
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

	it('handles keyframes', () => {
		const s = css`
			animation: spin 2s;
			animation-name: spin;
			@keyframes spin {
				0% {
					transform: rotate(0);
				}
				100% {
					transform: rotate(360);
				}
			}
			@keyframes move {
				from {
					left: 5%;
				}
				to {
					left: 85%;
				}
			}

			animation: 1s move;
		`
		expect(s).toMatchInlineSnapshot(`
			{
			  "animation": [
			    "testFile_spin__fspbdo0 2s",
			    "1s testFile_move__fspbdo1",
			  ],
			  "animation-name": "testFile_spin__fspbdo0",
			}
		`)
	})
})
