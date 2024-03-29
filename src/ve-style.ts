import {style as realStyle} from '@vanilla-extract/css'
import type {ComplexStyleRule, StyleRule} from '@vanilla-extract/css'
import {addFunctionSerializer} from '@vanilla-extract/css/functionSerializer'
import {css} from './css'
import {
	isStyled,
	QwikStyledComponent,
	styled as realStyled,
	Tags,
} from './qwik-styled.qwik'

// Copy of Vanilla Extract's ClassNames type
export type ClassNames = string | Array<ClassNames>

type StyledParam =
	| StyleRule
	| (StyleRule | QwikStyledComponent | ClassNames)[]
	| TemplateStringsArray
type StyledProxy = {
	[tag in Tags]: (
		cssOrClassList: StyledParam,
		...rest: any[]
	) => QwikStyledComponent<tag>
}

export const style = (cssArg: StyledParam, ...rest: any[]) => {
	if (!cssArg) throw new TypeError('CSS definition required')
	if (typeof cssArg === 'object' && 'raw' in cssArg && Array.isArray(cssArg)) {
		// Tagged template
		cssArg = css(cssArg, ...rest)
	} else if (Array.isArray(cssArg)) {
		cssArg = cssArg.map(o => (isStyled(o) ? o.class : o))
	}
	return realStyle(cssArg as ComplexStyleRule)
}

export const styled: StyledProxy = new Proxy({} as StyledProxy, {
	get<Tag extends Tags>(_this: any, tag: Tag) {
		return ((...args) => {
			const classes = style(...args)
			const Lite = realStyled(tag, classes)
			// This tells VE how to recreate Lite in the compiled CSS
			addFunctionSerializer(Lite, {
				importPath: 'styled-vanilla-extract/qwik-styled',
				importName: 'styled',
				// @ts-ignore
				args: [tag, classes],
			})

			return Lite
		}) as StyledProxy[Tag]
	},
})
