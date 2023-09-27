/// <reference types="vitest" />
import {defineConfig} from 'vite'
import {configDefaults} from 'vitest/config'
import {qwikVite} from '@builder.io/qwik/optimizer'
import pkg from './package.json'

const {dependencies = {}, peerDependencies = {}} = pkg as any
const makeRegex = (dep: string) => new RegExp(`^${dep}(/.*)?$`)
const excludeAll = (obj: {[pkg: string]: string}) =>
	Object.keys(obj).map(makeRegex)

export default defineConfig(() => {
	return {
		build: {
			target: 'es2020',
			lib: {
				entry: ['./src/index.ts', './src/qwik-styled.ts', './src/vite.ts'],
				formats: ['es', 'cjs'],
				fileName: (format: string, entryName: string) =>
					`${entryName}${entryName.includes('vite') ? '' : '.qwik'}.${
						format === 'es' ? 'mjs' : 'cjs'
					}`,
			},
			rollupOptions: {
				// externalize deps that shouldn't be bundled into the library
				external: [
					/^node:.*/,
					...excludeAll(dependencies),
					...excludeAll(peerDependencies),
				],
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
				},
			},
		},
		plugins: [qwikVite()],
		test: {
			/* for example, use global to avoid globals imports (describe, test, expect): */
			// globals: true,
			exclude: [...configDefaults.exclude, 'lib/**', 'lib-types/**'],
		},
	}
})
