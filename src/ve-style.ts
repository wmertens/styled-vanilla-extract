import {style as realStyle} from '@vanilla-extract/css'
import type {ComplexStyleRule} from '@vanilla-extract/css'
import {addFunctionSerializer} from '@vanilla-extract/css/functionSerializer'
import {css} from './css'
import {
	isStyled,
	QwikStyledComponent,
	styled as realStyled,
	Tags,
} from './qwik-styled'

export interface StyleFunction {
	(cssArg: ComplexStyleRule | Array<QwikStyledComponent<any>>): string
	(templateStringArg: TemplateStringsArray, ...args: any[]): string
}

function isTemplateArg(arg: any): arg is TemplateStringsArray {
	return typeof arg === 'object' && 'raw' in arg && Array.isArray(arg)
}

export const style: StyleFunction = (cssArg, ...rest) => {
	if (!cssArg) throw new TypeError('CSS definition required')
	if (isTemplateArg(cssArg)) {
		// Tagged template
		cssArg = css(cssArg, ...rest)
	} else if (Array.isArray(cssArg)) {
		cssArg = cssArg.map(o => (isStyled(o) ? o.class : o))
	}
	return realStyle(cssArg as ComplexStyleRule)
}

export interface StyledProxyFunction<T extends Tags> {
	(
		cssArg: ComplexStyleRule | Array<QwikStyledComponent<any>>
	): QwikStyledComponent<T>
	(
		templateStringArg: TemplateStringsArray,
		...args: any[]
	): QwikStyledComponent<T>
}

type StyledProxy = {
	[tag in Tags]: StyledProxyFunction<tag>
}

export const styled: StyledProxy = new Proxy({} as StyledProxy, {
	get<Tag extends Tags>(_this: any, tag: Tag): StyledProxyFunction<Tag> {
		return (first, ...args) => {
			const classes = isTemplateArg(first)
				? style(first, ...args)
				: style(first)
			const Lite = realStyled(tag, classes)
			// This tells VE how to recreate Lite in the compiled CSS
			addFunctionSerializer(Lite, {
				importPath: 'styled-vanilla-extract/qwik-styled',
				importName: 'styled',
				// @ts-ignore
				args: [tag, classes],
			})

			return Lite
		}
	},
})
