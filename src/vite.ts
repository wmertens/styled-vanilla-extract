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
const virtualRE = /.vanilla.(css|js)$/
const defaultExportRE = /^\s*export default\s.*$/m

interface Options {
	identifiers?: IdentifierOption
	esbuildOptions?: CompileOptions['esbuildOptions']
}
export function vanillaExtractPlugin({
	identifiers,
	esbuildOptions,
}: Options = {}): Plugin {
	let config: ResolvedConfig
	let server: ViteDevServer
	let postCssConfig: PostCSSConfigResult | null
	const cssMap = new Map<string, string>()

	let forceEmitCssInSsrBuild: boolean = !!process.env.VITE_RSC_BUILD
	let packageName: string

	const getAbsoluteVirtualFileId = (source: string) =>
		normalizePath(path.join(config.root, source))

	return {
		name: 'vanilla-extract',
		enforce: 'pre',
		configureServer(_server) {
			server = _server
		},
		config(_userConfig, env) {
			const include =
				env.command === 'serve' ? ['@vanilla-extract/css/injectStyles'] : []

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
				config.plugins.some(plugin =>
					['astro:build', 'solid-start-server', 'vite-plugin-qwik'].includes(
						plugin.name
					)
				)
			) {
				forceEmitCssInSsrBuild = true
			}
		},
		// Re-parse .css.ts files when they change
		async handleHotUpdate({file, modules}) {
			if (!cssFileFilter.test(file)) return
			try {
				const virtuals: any[] = []
				const invalidate = (type: string) => {
					const found = server.moduleGraph.getModulesByFile(`${file}${type}`)
					found?.forEach(m => {
						virtuals.push(m)
						return server.moduleGraph.invalidateModule(m)
					})
				}
				invalidate(virtualExtCss)
				invalidate(virtualExtJs)
				// load new CSS
				await server.ssrLoadModule(file)
				return [...modules, ...virtuals]
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(e)
				throw e
			}
		},
		// Convert .vanilla.(js|css) URLs to their absolute version
		resolveId(source) {
			const [validId, query] = source.split('?')
			if (!validId.endsWith(virtualExtCss) && !validId.endsWith(virtualExtJs)) {
				return
			}

			// Absolute paths seem to occur often in monorepos, where files are
			// imported from outside the config root.
			const absoluteId = source.startsWith(config.root)
				? source
				: getAbsoluteVirtualFileId(validId)

			// Keep the original query string for HMR.
			return absoluteId + (query ? `?${query}` : '')
		},
		// Provide virtual CSS content
		async load(id) {
			const [validId] = id.split('?')

			if (!virtualRE.test(validId)) {
				return
			}

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

			if (validId.endsWith(virtualExtCss)) {
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
		async transform(code, id, ssrParam) {
			const [validId] = id.split('?')

			if (!cssFileFilter.test(validId)) {
				return null
			}

			const identOption =
				identifiers ?? (config.mode === 'production' ? 'short' : 'debug')

			let ssr: boolean | undefined

			if (typeof ssrParam === 'boolean') {
				ssr = ssrParam
			} else {
				ssr = ssrParam?.ssr
			}

			if (ssr && !forceEmitCssInSsrBuild) {
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
				if (config.command === 'build' || file !== validId) {
					this.addWatchFile(file)
				}
			}

			const hasDefaultExport = defaultExportRE.test(code)
			let cssSource, filePath
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

					;({filePath} = args.fileScope)
					const projectRootRelativeId = `${filePath}${
						config.command === 'build' || (ssr && forceEmitCssInSsrBuild)
							? virtualExtCss
							: virtualExtJs
					}`
					const absoluteId = getAbsoluteVirtualFileId(projectRootRelativeId);
					// using relative path to the workspace root in a posix style
					const cwdRelativeId =  path.relative(process.cwd(), absoluteId)
						.split(path.sep)
						.join(path.posix.sep);

					if (
						server &&
						cssMap.has(absoluteId) &&
						cssMap.get(absoluteId) !== cssSource
					) {
						const {moduleGraph} = server
						const [module] = Array.from(
							moduleGraph.getModulesByFile(absoluteId) || []
						)

						if (module) {
							moduleGraph.invalidateModule(module)

							// Vite uses this timestamp to add `?t=` query string automatically for HMR.
							module.lastHMRTimestamp =
								(module as any).lastInvalidationTimestamp || Date.now()
						}

						server.ws.send({
							type: 'custom',
							event: styleUpdateEvent(absoluteId),
							data: cssSource,
						})
					}

					cssMap.set(absoluteId, cssSource)

					if (hasDefaultExport)
						// We emit the css only in the default export
						// so no import-giving-side-effects
						return ''

					// We use the root relative id here to ensure file contents (content-hashes)
					// are consistent across build machines
					return `import "${cwdRelativeId}";`
				},
			})

			if (hasDefaultExport)
				// We re-export to allow better tree shaking
				output = output.replace(
					defaultExportRE,
					`export {default as default} from '${filePath}${virtualExtCss}?inline';`
				)

			return {
				code: output,
				// importing a .css file has side effects
				moduleSideEffects: !hasDefaultExport,
				map: {mappings: ''},
			}
		},
	}
}
