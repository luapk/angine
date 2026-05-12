import { PALETTES } from './SceneDirector.js'

// Resolve a palette enum to concrete colors for various layers.
// Each layer reads the colors it cares about; keeps everything consistent.
export function resolvePalette(palette) {
  switch (palette) {
    case PALETTES.BLACK_ON_WHITE:
      return {
        bg:        '#ffffff',
        polka:     '#000000',
        keyline:   '#000000',
        objectFg:  '#000000',
        objectEmissive: '#000000',
        accent:    '#000000',
        pyramidEmissive: '#000000',
        bloomColor: '#000000',
      }
    case PALETTES.GOLD_ACCENT:
      return {
        bg:        '#000000',
        polka:     '#d4a017',     // gold dots
        keyline:   '#d4a017',
        objectFg:  '#ffffff',
        objectEmissive: '#3a2a04',
        accent:    '#d4a017',
        pyramidEmissive: '#d4a017',
        bloomColor: '#d4a017',
      }
    case PALETTES.WHITE_ON_BLACK:
    default:
      return {
        bg:        '#000000',
        polka:     '#ffffff',
        keyline:   '#ffffff',
        objectFg:  '#ffffff',
        objectEmissive: '#0a0a0a',
        accent:    '#ffffff',
        pyramidEmissive: '#111111',
        bloomColor: '#ffffff',
      }
  }
}
