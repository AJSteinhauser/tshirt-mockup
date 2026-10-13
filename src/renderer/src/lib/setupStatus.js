export const SIDES = ['front', 'back']

export function calibratedShirtsFor(side, shirtFiles, shirtsConfig) {
  return shirtFiles.filter((f) => shirtsConfig[f]?.quad && (shirtsConfig[f]?.side ?? 'front') === side)
}

export function isSideReady(side, { templateQuads, shirtFiles, shirtsConfig }) {
  return Boolean(templateQuads[side]) && calibratedShirtsFor(side, shirtFiles, shirtsConfig).length > 0
}

export function firstReadySide(setup) {
  return SIDES.find((s) => isSideReady(s, setup)) ?? null
}
