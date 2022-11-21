import {style as realStyle} from '@vanilla-extract/css'
import type {
	ClassNames,
	ComplexStyleRule,
	StyleRule,
} from '@vanilla-extract/css/dist/declarations/src/types'
import {addFunctionSerializer} from '@vanilla-extract/css/functionSerializer'
import {css} from './css'
import {
	isStyled,
	QwikStyledComponent,
	styled as realStyled,
	Tags,
} from './qwik-styled'

type StyledParam =
	| StyleRule
	| (StyleRule | QwikStyledComponent | ClassNames)[]
	| TemplateStringsArray
type StyledProxy = {
	[tag in Tags]: (cssOrClassList: StyledParam) => QwikStyledComponent<tag>
}

export const style = (cssArg: StyledParam, ...rest: any[]) => {
	if (!cssArg) throw new TypeError('CSS definition required')
	if (typeof cssArg === 'object' && 'raw' in cssArg && Array.isArray(cssArg)) {
		// Tagged template
		cssArg = css(cssArg, ...rest)
	} else if (Array.isArray(cssArg)) {
		cssArg = cssArg.map(o => (isStyled(o) ? o.className : o))
	}
	return realStyle(cssArg as ComplexStyleRule)
}

export const styled: StyledProxy = new Proxy({} as StyledProxy, {
	get<Tag extends Tags>(_this: any, tag: Tag) {
		return ((...args) => {
			const className = style(...args)
			const Lite = realStyled(tag, className)
			// This tells VE how to recreate Lite in the compiled CSS
			addFunctionSerializer(Lite, {
				importPath: 'styled-vanilla-extract/qwik-styled',
				importName: 'styled',
				// @ts-ignore
				args: [tag, className],
			})

			return Lite
		}) as StyledProxy[Tag]
	},
})
