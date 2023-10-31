// re-export to make TS happy when not using nodenext import resolution
export type * from '../lib/vite.d.ts'
// @ts-expect-error 2308
export * from '../lib/vite.mjs'
