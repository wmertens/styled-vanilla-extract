import {FunctionComponent} from '@builder.io/qwik'
import {assertType, describe, expect, expectTypeOf, it} from 'vitest'
import {style, styled} from './ve-style'
import {setFileScope} from '@vanilla-extract/css/fileScope'
import {QwikStyledComponent} from './qwik-styled'
import {veClassRE, veMultiClassRE} from './css'

// Make VE happy about running in this file
setFileScope('src/testFile.css.ts', 'testPackage')

describe('style', () => {
	it('should accept Styled arguments', () => {
		const Tag1 = styled.div({color: 'red'})
		const className = style([Tag1, {color: 'red'}])
		expect(className).toMatch(veMultiClassRE)
	})
	it('should accept `` for CSS', () => {
		const className = style`
			color: red;
		`
		expect(className).toMatch(veClassRE)
	})
})

describe('styled[tag]', () => {
	it('should return a Lite Component', () => {
		const Tag = styled.span({})
		assertType<FunctionComponent>(Tag)
		assertType<QwikStyledComponent<'span'>>(Tag)
	})

	it('should have and be a className', () => {
		const Tag = styled.div({})
		expectTypeOf(Tag.className).toBeString()
		expect(String(Tag)).toMatch(veClassRE)
	})

	it('should compose', () => {
		const Tag1 = styled.div({})
		const Tag2 = styled.div([Tag1, {}])
		expect(String(Tag2)).toMatch(veMultiClassRE)
	})

	it('should accept style arguments', () => {
		const Tag1 = styled.div({color: 'red'})
		expect(Tag1.className).toMatch(veClassRE)
		const Tag2 = styled.div([Tag1, {color: 'red'}])
		expect(Tag2.className).toMatch(veMultiClassRE)
	})
	it('should accept `` for CSS', () => {
		const Tag = styled.div`
			color: red;
		`
		expect(Tag.className).toMatch(veClassRE)
	})
})
