// re-export to make TS happy when not using nodenext import resolution
export type * from '../lib/index.d.ts'
// @ts-expect-error 2308
export * from '../lib/index.mjs'
