import {describe, it, expect} from 'vitest'
import {setFileScope} from '@vanilla-extract/css/fileScope'
import {css} from './css'
import {styled} from './ve-style'

// Make VE happy about running in this file
setFileScope('src/testFile.css.ts', 'testPackage')

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
		expect(Tag1.className).toMatchInlineSnapshot('"testFile__fspbdo1 testFile__fspbdo0"')
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
})
