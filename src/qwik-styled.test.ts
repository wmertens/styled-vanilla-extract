import {describe, expect, it} from 'vitest'
import {isStyled, styled} from './qwik-styled.qwik'

describe('isStyled', () => {
	it('should detect Styled functions', () => {
		const Tag = styled('div', 'hello')
		expect(isStyled(Tag)).toBe(true)
		expect(isStyled(() => {})).toBe(false)
	})
	it('should have .class', () => {
		const Tag = styled('div', 'hello')
		expect(Tag.class).toBe('hello')
		expect(Object.keys(Tag)).includes('class')
	})
	it('should have deprecated .className', () => {
		const Tag = styled('div', 'hello')
		expect((Tag as any).className).toBe('hello')
		expect(Object.keys(Tag)).not.includes('className')
	})
})
