module.exports = {
	root: true,
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:qwik/recommended',
		// Keep this last, it overrides all style rules
		'plugin:prettier/recommended',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: ['./tsconfig.json'],
		ecmaVersion: 2021,
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true,
		},
	},
	plugins: ['@typescript-eslint'],
	rules: {
		'default-param-last': 1,
		// == and != are nice for null+undefined
		eqeqeq: [2, 'allow-null'],
		// we want a clean console - eslint-disable every wanted one
		'no-console': 2,
		// !! is fun
		'no-implicit-coercion': [2, {allow: ['!!']}],
		// sometimes causes logic bugs.
		'no-shadow': 2,
		// allow unused vars starting with _
		'@typescript-eslint/no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^_',
				ignoreRestSiblings: true,
				varsIgnorePattern: '^_',
			},
		],
		'object-shorthand': 2,
		'prefer-destructuring': [
			2,
			{AssignmentExpression: {array: false, object: false}},
		],
		// don't distract while programming
		'prettier/prettier': 1,
		'valid-typeof': [2, {requireStringLiterals: true}],
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-inferrable-types': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'@typescript-eslint/no-empty-interface': 'off',
		'@typescript-eslint/no-namespace': 'off',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-this-alias': 'off',
		'@typescript-eslint/ban-types': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'prefer-spread': 'off',
		'no-case-declarations': 'off',
	},
	reportUnusedDisableDirectives: true,
}
