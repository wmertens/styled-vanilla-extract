import {defineConfig} from 'vite'
import {qwikVite} from '@builder.io/qwik/optimizer'
import pkg from './package.json'

const {dependencies = {}, peerDependencies = {}} = pkg as any
const makeRegex = dep => new RegExp(`^${dep}(/.*)?$`)
const excludeAll = obj => Object.keys(obj).map(makeRegex)

export default defineConfig(() => {
	return {
		build: {
			target: 'es2020',
			lib: {
				entry: ['./src/index.ts', './src/real-styled.tsx'],
				formats: ['es', 'cjs'],
			},
			rollupOptions: {
				// externalize deps that shouldn't be bundled into the library
				external: [
					/^node:.*/,
					...excludeAll(dependencies),
					...excludeAll(peerDependencies),
				],
			},
		},
		plugins: [qwikVite()],
	}
})
