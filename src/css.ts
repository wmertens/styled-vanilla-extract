import type {StyleRule} from '@vanilla-extract/css'
import {compile} from 'stylis'

export const veClassRE = /^[a-zA-Z0-9_./]*[a-z0-9]{6}\d+$/
export const veMultiClassRE = /^([a-zA-Z0-9_./]*[a-z0-9]{6}\d+( |$)){2,}/
export const veVariableRE = /^var\(.*\)$/

export const css = (
	tpl: TemplateStringsArray,
	...expr: string[]
): StyleRule => {
	let output = tpl[0]
	for (let i = 1; i < tpl.length; i++) {
		// We generate placeholders here and insert the expr during conversion,
		// and then when encountering selectors changing the classlist to `.${firstClass}`
		output += `##${i - 1}##`
		output += tpl[i]
	}

	const classListToSelector = (cl: string) => {
		if (veMultiClassRE.test(cl)) {
			const i = cl.indexOf(' ')
			return `.${i === -1 ? cl : cl.slice(0, i)}`
		}
		return cl
	}
	const getExpr = (idx: number | string) => {
		const value = expr[Number(idx)]
		if (typeof value === 'function' && !('toString' in value))
			throw new Error('You cannot pass functions to css')
		return `${value}`
	}
	const interpolateKey = (str: string) =>
		typeof str === 'string'
			? str.replace(/##(\d+)##/g, (_, e) => {
					const key = getExpr(e)
					if (veVariableRE.test(key)) return key.slice(4, -1)
					return key
			  })
			: `!!!{${typeof str}: ${str}}`
	const interpolateValue = (str: string) =>
		typeof str === 'string'
			? str.replace(/##(\d+)##/g, (_, e) => getExpr(e))
			: `!!!{${typeof str}: ${str}}`
	const interpolateSelector = (str: string) =>
		str
			.replace(/##(\d+)##/g, (_, e) => classListToSelector(getExpr(e)))
			.replace(/&\f/g, '&')

	const compiledToVE = (compiled: ReturnType<typeof compile>): StyleRule => {
		const style: StyleRule = {}
		const declaration = (obj: {[x: string]: any}, k: string, v: string) => {
			if (obj[k]) {
				// multiple declarations
				if (!Array.isArray(obj[k])) obj[k] = [obj[k]]
				obj[k].push(v)
			} else obj[k] = v
		}
		const assignInto = (type: keyof StyleRule, k: string, children: any) => {
			// @ts-ignore
			style[type] ||= {} as StyleRule
			// @ts-ignore
			if (style[type][k]) throw new Error(`${type}.${k} is already defined`)
			// @ts-ignore
			style[type][k] = children
		}
		for (const {type, props, children, value} of compiled) {
			// Remove comments
			if (type === 'comm') continue
			const isBlock = Array.isArray(children)
			const name =
				type === 'rule'
					? isBlock
						? interpolateSelector(value)
						: interpolateSelector(props as string)
					: interpolateKey(isBlock ? props[0] : (props as string))

			if (isBlock) {
				const v = compiledToVE(children)
				// @ts-ignore
				if (type === 'rule') assignInto('selectors', name, v)
				// @ts-ignore
				else assignInto(type, name, v)
			} else {
				const v = interpolateValue(children)
				declaration(style, name, v)
			}
		}
		return style
	}
	const compiled = compile(output)
	return compiledToVE(compiled)
}
