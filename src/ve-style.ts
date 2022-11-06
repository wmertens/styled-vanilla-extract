import {FunctionComponent, QwikIntrinsicElements} from '@builder.io/qwik'
import {style, ComplexStyleRule} from '@vanilla-extract/css'
import {addFunctionSerializer} from '@vanilla-extract/css/functionSerializer'
import {styled as realStyled, Tags} from './real-styled'

type StyledProxy = {
	[tag in Tags]: (
		cssOrClassList: ComplexStyleRule | string
	) => FunctionComponent<QwikIntrinsicElements[tag]>
}

export const styled: StyledProxy = new Proxy({} as StyledProxy, {
	get(_this, tag: Tags) {
		return (cssOrClassList: ComplexStyleRule | string) => {
			const className =
				typeof cssOrClassList === 'string'
					? cssOrClassList
					: style(cssOrClassList, tag as Tags)
			const Lite = realStyled(tag, className)
			// This tells VE how to recreate Lite in the compiled CSS
			addFunctionSerializer(Lite, {
				importPath: 'qwik-styled-ve/lib/real-styled.js',
				importName: 'styled',
				// @ts-ignore
				args: [tag, className],
			})

			return Lite
		}
	},
})
