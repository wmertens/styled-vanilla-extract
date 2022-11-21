import {describe, expect, it} from 'vitest'
import {isStyled, styled} from './qwik-styled'

describe('isStyled', () => {
	it('should detect Styled functions', () => {
		const Tag = styled('div', 'hello')
		expect(isStyled(Tag)).toBe(true)
		expect(isStyled(() => {})).toBe(false)
	})
})
