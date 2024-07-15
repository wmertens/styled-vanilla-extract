/**
 * This plugin has hooks that work as follows:
 * - transform is called on the css.ts file
 *   - this converts the css to classnames and stores the css in a map.
 *   - it adds an import for the virtual css.ts.vanilla.css file
 * - resolveId is called on the virtual css.ts.vanilla.css file
 *   - this returns the full path to the virtual css.ts.vanilla.css file
 * - load is called on the virtual css.ts.vanilla.css file
 *   - this returns the css from the map
 */

import path from 'node:path'

import type {Plugin, ResolvedConfig, ViteDevServer} from 'vite'
import {normalizePath} from 'vite'
import outdent from 'outdent'
import {
	cssFileFilter,
	processVanillaFile,
	compile,
	IdentifierOption,
	getPackageInfo,
	CompileOptions,
	transform,
} from '@vanilla-extract/integration'
import {PostCSSConfigResult, resolvePostcssConfig} from './postcss'

const styleUpdateEvent = (fileId: string) =>
	`vanilla-extract-style-update:${fileId}`

const virtualExtCss = '.vanilla.css'
const virtualExtJs = '.vanilla.js'
const virtualRE = /^(?<source>.*?)(?<ext>\.vanilla\.(css|js))?(?<query>\?.*)?$/
type IdMatch =
	| {
			groups: {
				source: string
				ext?: string
				query?: string
			}
	  }
	| undefined
const defaultExportRE = /^\s*export default\s.*$/m

interface Options {
	identifiers?: IdentifierOption
	emitCssInSsr?: boolean
	esbuildOptions?: CompileOptions['esbuildOptions']
}
export function vanillaExtractPlugin({
	identifiers,
	emitCssInSsr,
	esbuildOptions,
}: Options = {}): Plugin {
	let config: ResolvedConfig
	let server: ViteDevServer
	let postCssConfig: PostCSSConfigResult | null
	const cssMap = new Map<string, string>()
	// Qwik handles injecting styles in SSR itself
	let disableInject = false
	const cwd = process.cwd()

	const hasEmitCssOverride = typeof emitCssInSsr === 'boolean'
	let resolvedEmitCssInSsr: boolean = hasEmitCssOverride
		? emitCssInSsr
		: !!process.env.VITE_RSC_BUILD
	let packageName: string

	const getAbsoluteVirtualFileId = (source: string) =>
		normalizePath(path.join(config.root, source))

	return {
		name: 'vanilla-extract',
		enforce: 'pre',

		configureServer(_server) {
			server = _server
		},

		config(userConfig, env) {
			disableInject ||= !!userConfig?.plugins?.some(
				(plugin: any) => plugin?.name === 'vite-plugin-qwik'
			)

			const include =
				env.command === 'serve' && !disableInject
					? ['@vanilla-extract/css/injectStyles']
					: []

			return {
				optimizeDeps: {include},
				ssr: {
					external: [
						'@vanilla-extract/css',
						'@vanilla-extract/css/fileScope',
						'@vanilla-extract/css/adapter',
					],
				},
			}
		},

		async configResolved(resolvedConfig) {
			config = resolvedConfig
			packageName = getPackageInfo(config.root).name

			if (config.command === 'serve') {
				postCssConfig = await resolvePostcssConfig(config)
			}

			if (
				!hasEmitCssOverride &&
				config.plugins.some(plugin =>
					[
						'astro:build',
						'solid-start-server',
						'vite-plugin-qwik',
						'vite-plugin-svelte',
					].includes(plugin.name)
				)
			) {
				resolvedEmitCssInSsr = true
			}
		},

		// Convert .vanilla.(js|css) URLs to their absolute version
		resolveId(source) {
			const match = virtualRE.exec(source) as unknown as IdMatch
			if (!match?.groups!.ext) return
			const {source: validId, ext, query} = match.groups

			// Absolute paths seem to occur often in monorepos, where files are
			// imported from outside the config root.
			const absoluteId = validId.startsWith(config.root)
				? validId
				: getAbsoluteVirtualFileId(validId)

			// There should always be an entry in the `cssMap` here.
			// The only valid scenario for a missing one is if someone had written
			// a file in their app using the .vanilla.js/.vanilla.css extension
			if (cssMap.has(absoluteId)) {
				// Keep the original query string for HMR.
				return absoluteId + ext + (query || '')
			}
		},
		// Provide virtual .vanilla.(js|css) content
		async load(id) {
			const match = virtualRE.exec(id) as unknown as IdMatch
			if (!match?.groups.ext) return
			const {source: validId} = match.groups

			if (!cssMap.has(validId)) {
				// Try to parse the parent
				const parentId = validId.replace(virtualRE, '')
				await server.ssrLoadModule(parentId)
				// Now we should have the CSS
				if (!cssMap.has(validId)) return
			}

			const css = cssMap.get(validId)

			if (typeof css !== 'string') {
				return
			}

			if (match.groups.ext === virtualExtCss) {
				return css
			}
			return outdent`
				import { injectStyles } from '@vanilla-extract/css/injectStyles';

				const inject = (css) => injectStyles({
				fileScope: ${JSON.stringify({filePath: validId})},
				css
				});

				inject(${JSON.stringify(css)});

				if (import.meta.hot) {
					import.meta.hot.on('${styleUpdateEvent(validId)}', (css) => {
						inject(css);
					});
				}
			`
		},

		// Side-effect: If this results in new CSS, it will send HMR event
		async transform(code, id, viteOptions) {
			const match = virtualRE.exec(id) as unknown as IdMatch
			if (
				!match ||
				!cssFileFilter.test(match.groups.source) ||
				// We don't want to transform the virtual files
				match.groups.ext
			)
				return null
			const {source: validId} = match.groups

			// TODO when css exists in map, use it. Needs remove on invalidate

			const identOption =
				identifiers ?? (config.mode === 'production' ? 'short' : 'debug')

			const ssr =
				// support old Vite API
				typeof viteOptions === 'boolean' ? viteOptions : viteOptions?.ssr

			// If we're in SSR mode, and we're not emitting CSS in SSR, then
			// we can skip the transform. The CSS will be injected on the
			// client by running the VE functions.
			if (ssr && !resolvedEmitCssInSsr) {
				return transform({
					source: code,
					filePath: normalizePath(validId),
					rootPath: config.root,
					packageName,
					identOption,
				})
			}

			const {source, watchFiles} = await compile({
				filePath: validId,
				cwd: config.root,
				esbuildOptions,
				identOption,
			})

			for (const file of watchFiles) {
				// In start mode, we need to prevent the file from rewatching itself.
				// If it's a `build --watch`, it needs to watch everything.
				if (config.command === 'build' || normalizePath(file) !== validId) {
					this.addWatchFile(file)
				}
			}

			const hasDefaultExport = defaultExportRE.test(code)
			let cssSource, virtualPath
			let output = await processVanillaFile({
				source,
				filePath: validId,
				identOption,
				serializeVirtualCssPath: async args => {
					cssSource = args.source

					// TODO It looks like Vite does this already? Should this go?
					if (postCssConfig) {
						const postCssResult = await (await import('postcss'))
							.default(postCssConfig.plugins)
							.process(cssSource, {
								...postCssConfig.options,
								from: undefined,
								map: false,
							})

						cssSource = postCssResult.css
					}

					// The extension of the virtual file we'll be importing. .vanilla.css is the CSS text, and .vanilla.js is JS that injects it.
					const ext =
						config.command === 'build' ||
						(ssr && resolvedEmitCssInSsr) ||
						disableInject
							? virtualExtCss
							: virtualExtJs

					const projectRootRelativeId = args.fileScope.filePath
					const absoluteIdNoExt = getAbsoluteVirtualFileId(
						projectRootRelativeId
					)
					// using relative path to the workspace root in a posix style
					virtualPath = path
						.relative(cwd, absoluteIdNoExt)
						.split(path.sep)
						.join(path.posix.sep)

					// During serving, if the CSS is different, we need to invalidate the
					// module subgraph so that the new CSS is injected.
					if (
						server &&
						cssMap.has(absoluteIdNoExt) &&
						cssMap.get(absoluteIdNoExt) !== cssSource
					) {
						const {moduleGraph} = server
						const modules = Array.from(
							moduleGraph.getModulesByFile(absoluteIdNoExt) || []
						)
						const virtualCSSModules = Array.from(
							moduleGraph.getModulesByFile(
								`${absoluteIdNoExt}${virtualExtCss}`
							) || []
						)

						for (const module of [...modules, ...virtualCSSModules]) {
							if (module) {
								moduleGraph.invalidateModule(module)

								// Vite uses this timestamp to add `?t=` query string automatically for HMR.
								module.lastHMRTimestamp =
									(module as any).lastInvalidationTimestamp || Date.now()
							}
						}

						// Notify our injected js that the CSS has changed
						server.ws.send({
							type: 'custom',
							event: styleUpdateEvent(absoluteIdNoExt),
							data: cssSource,
						})
					}

					cssMap.set(absoluteIdNoExt, cssSource)

					if (hasDefaultExport)
						// We emit the css only in the default export
						// so no import-giving-side-effects
						return ''

					// We use the root relative id here to ensure file contents (content-hashes)
					// are consistent across build machines
					return `import "${virtualPath}${ext}";`
				},
			})

			if (hasDefaultExport)
				// We re-export to allow better tree shaking
				output = output.replace(
					defaultExportRE,
					`export {default as default} from '${virtualPath}${virtualExtCss}?inline';`
				)

			return {
				code: output,
				map: {mappings: ''},
			}
		},
	}
}
