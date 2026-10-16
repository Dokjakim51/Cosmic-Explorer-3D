# Credits and asset registry

## Three.js

Cosmic Explorer Phase 5.7 uses **three.js r185 / npm package 0.185.1** and selected official addons (`OrbitControls`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, and `OutputPass`). Three.js is distributed under the MIT License.

- Project: https://github.com/mrdoob/three.js
- License: https://github.com/mrdoob/three.js/blob/dev/LICENSE

## Earth texture proof

The Phase 5.7 Earth proof uses imagery derived from NASA's Visible Earth / Blue Marble resources and NASA Black Marble night-light imagery. The project creates reduced-size working maps and locally generated normal/roughness maps for interactive rendering.

| Asset in Cosmic Explorer | Source | Use / modification |
|---|---|---|
| `earth_day_2k.jpg` | NASA Visible Earth, Blue Marble land and ocean imagery | Resized and optimized as the PBR color map |
| `earth_clouds_2k.png` | NASA Visible Earth cloud imagery | Converted into a transparent, independently rotating cloud layer |
| `earth_night_2k.jpg` | NASA Earth Observatory / Black Marble | Resized and used by an additive night-lights shader |
| `earth_normal_2k.png` | Derived locally from the Earth color data | Normal detail for `MeshPhysicalMaterial` |
| `earth_roughness_2k.png` | Derived locally from the Earth color data | Controls land/ocean surface response |

NASA source pages:

- https://visibleearth.nasa.gov/collection/1484/blue-marble
- https://visibleearth.nasa.gov/images/57752/blue-marble-land-surface-shallow-water-and-shaded-topography
- https://earthobservatory.nasa.gov/features/NightLights

## Gallery proof

| Asset | Credit | Source | Modification |
|---|---|---|---|
| Pillars of Creation (Webb NIRCam) | NASA, ESA, CSA, STScI | https://science.nasa.gov/asset/webb/pillars-of-creation-nircam-image/ | Downloaded from the official source and resized into card/viewer versions |

## Planetary data sources

Planet descriptions and numerical facts are summarized and rounded from official NASA Science fact pages. Accessed July 30, 2026.

| Object | Source | Usage |
|---|---|---|
| Mercury | https://science.nasa.gov/mercury/facts/ | Educational facts and physical properties |
| Venus | https://science.nasa.gov/venus/venus-facts/ | Educational facts and physical properties |
| Earth | https://science.nasa.gov/earth/facts/ | Educational facts and physical properties |
| Mars | https://science.nasa.gov/mars/facts/ | Educational facts and physical properties |
| Jupiter | https://science.nasa.gov/jupiter/jupiter-facts/ | Educational facts and physical properties |
| Saturn | https://science.nasa.gov/saturn/facts/ | Educational facts and physical properties |
| Uranus | https://science.nasa.gov/uranus/facts/ | Educational facts and physical properties |
| Neptune | https://science.nasa.gov/neptune/neptune-facts/ | Educational facts and physical properties |

## Stellar data sources

Stellar values are approximate and may differ between studies because of variability, distance uncertainty, rapid rotation, binary companions, and stellar modeling.

| Object | Source | Usage |
|---|---|---|
| Sun | https://science.nasa.gov/sun/facts/ | General physical properties and evolution |
| Sirius | https://science.nasa.gov/missions/hubble/astronomers-use-hubble-to-weigh-dog-stars-companion/ | Sirius system, temperature, and companion context |
| Vega | https://science.nasa.gov/photojournal/tiny-particles-so-far-away/ | Distance and debris-disk context |
| Betelgeuse | https://science.nasa.gov/universe/what-is-betelgeuse-inside-the-strange-volatile-star/ | Evolution, size, temperature, age, and variability |
| Rigel | https://science.nasa.gov/universe/glossary/ | Blue-supergiant comparison values |
| Polaris | https://science.nasa.gov/missions/hubble/theres-more-to-the-north-star-than-meets-the-eye/ | Distance and multiple-star system |
| Proxima Centauri | https://science.nasa.gov/asset/hubble/proxima-centauri/ | Distance, low mass, luminosity, and flare-star behavior |
| Antares | https://science.nasa.gov/solar-system/skywatching/night-sky-network/july2025-night-sky-notes/ | Red-supergiant classification and sky context |
