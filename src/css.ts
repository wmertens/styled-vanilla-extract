import type {ComplexStyleRule} from '@vanilla-extract/css'
import {compile} from 'stylis'

export const css = (
	tpl: TemplateStringsArray,
	...expr: string[]
): ComplexStyleRule => {
	let out = tpl[0]
	for (let i = 1; i < tpl.length; i++) {
		// We generate placeholders here and insert the expr during conversion,
		// and then when encountering selectors changing the classlist to `.${firstClass}`
		out += `##${i - 1}##`
		out += tpl[i]
	}

	const classListToSelector = (cl: string) => {
		if (/^(([a-z\d_]+__)?[a-z\d]{6}\d+( |$))+/.test(cl)) {
			const i = cl.indexOf(' ')
			return `.${i === -1 ? cl : cl.slice(0, i)}`
		}
		return cl
	}
	const recover = (str: string) =>
		typeof str === 'string'
			? str.replace(/##(\d+)##/g, (_, e) => expr[+e])
			: `!!!{${typeof str}: ${str}}`
	const selector = (str: string) =>
		str
			.replace(/##(\d+)##/g, (_, e) => classListToSelector(expr[+e]))
			.replace(/&\f/g, '&')

	const compiledToVE = (
		compiled: ReturnType<typeof compile>
	): ComplexStyleRule => {
		const out: ComplexStyleRule = {}
		const assignDecll = (obj: {[x: string]: any}, k: string, v: string) => {
			if (obj[k]) {
				if (!Array.isArray(obj[k])) obj[k] = [obj[k]]
				obj[k].push(v)
			} else obj[k] = v
		}
		const assignObj = (
			type: keyof ComplexStyleRule,
			k: string,
			children: any
		) => {
			// @ts-ignore
			out[type] ||= {} as ComplexStyleRule
			// @ts-ignore
			if (out[type][k]) throw new Error(`${type}.${k} is already defined`)
			// @ts-ignore
			out[type][k] = children
		}
		for (const {type, props, children, value} of compiled) {
			if (type === 'comm') continue
			const isParent = Array.isArray(children)
			const name =
				type === 'rule'
					? isParent
						? selector(value)
						: selector(props as string)
					: recover(isParent ? props[0] : (props as string))

			if (isParent) {
				const v = compiledToVE(children)
				// @ts-ignore
				if (type === 'rule') assignObj('selectors', name, v)
				// @ts-ignore
				else assignObj(type, name, v)
			} else {
				const v = recover(children)
				assignDecll(out, name, v)
			}
		}
		return out
	}
	const compiled = compile(out)
	// return compiled;
	return compiledToVE(compiled)
}
