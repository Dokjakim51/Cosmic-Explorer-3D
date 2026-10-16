# Kira — Astronomical data sources

Local data snapshot updated: **2026-08-01**.

Kira never contacts these sources at runtime. The values, descriptions, source labels, and uncertainty notes are stored inside `src/features/kira/kira-astronomy-data.js` so the assistant remains completely local and offline-capable.

## Nearest-known examples stored locally

| Category | Local example | Stored distance | Source | Important caveat |
|---|---|---:|---|---|
| Stellar black hole | Gaia BH1 | ~1,560 ly | ESA Gaia, “Gaia discovers a new family of black holes” | Closest known black hole in the current local snapshot; rankings can change with discoveries. |
| Pulsar | PSR J0108−1431 | ~420–770 ly | Chandra photo release plus later HST literature | Published estimates vary, so Kira presents a range rather than a false exact value. |
| Magnetar | Swift J1822.3−1606 | ~5,200 ly (1.6 kpc) | McGill Online Magnetar Catalog / published study | The distance is associated with M17 and remains uncertain. |
| Quasar | Markarian 231 | ~581 million ly | NASA/Hubble | Stored as the nearest known quasar in the cited NASA material. |
| Blazar | Markarian 421 | ~400 million ly | NASA technical literature | Presented as one of the nearest known blazars, not a permanent absolute ranking. |
| Tidal disruption event | ASASSN-14li | ~290 million ly | NASA | Described relative to the discovery record at the time of the announcement. |
| Supernova remnant | Vela SNR | ~815 ly | NASA/Hubble | A remnant of a past explosion, not a currently active supernova. |
| Historical supernova reference | Vela supernova | ~815 ly | NASA/Hubble | Used as a local historical reference inferred from the nearby remnant, not a prediction. |
| Kilonova / neutron-star merger | GW170817 / AT2017gfo | ~130 million ly | NASA | A well-documented nearby observed example, not a claim that no closer event could exist. |
| Planetary nebula | Helix Nebula | ~650 ly | NASA/Hubble | Described as one of the nearest known planetary nebulae. |
| Wolf–Rayet system | Gamma² Velorum (WR 11) | ~1,100 ly (~336 pc) | MNRAS / ADS literature | Rounded from the cited orbital distance; distance determinations have evolved. |
| Gamma-ray burst host | GRB 980425 / ESO 184-G82 | ~100 million ly | NASA | Approximate host-galaxy distance and local nearest-known reference. |

## Source URLs recorded in the project

- ESA Gaia — https://www.esa.int/Science_Exploration/Space_Science/Gaia/Gaia_discovers_a_new_family_of_black_holes
- Chandra PSR J0108−1431 — https://chandra.harvard.edu/photo/2009/j0108/
- McGill Magnetar Catalog — https://www.physics.mcgill.ca/~pulsar/magnetar/Tab7.html
- NASA/Hubble Markarian 231 — https://science.nasa.gov/asset/hubble/quasar-host-galaxy-markarian-231/
- NASA NTRS Markarian 421 literature — https://ntrs.nasa.gov/api/citations/19940032414/downloads/19940032414.pdf
- NASA ASASSN-14li — https://www.nasa.gov/image-article/tidal-disruption/
- NASA/Hubble Vela SNR — https://science.nasa.gov/asset/hubble/the-pencil-nebula-remnants-of-an-exploded-star-ngc-2736/
- NASA GW170817 — https://www.nasa.gov/universe/all-in-the-family-kin-of-gravitational-wave-source-discovered/
- NASA/Hubble Helix Nebula — https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-63/
- Gamma² Velorum research record — https://ui.adsabs.harvard.edu/abs/2000A%26A...358..187V/abstract
- NASA gamma-ray burst material — https://www.nasa.gov/universe/nasa-looks-back-at-50-years-of-gamma-ray-burst-science/

## Interpretation policy

- Kira says **“known”**, **“one of the nearest”**, or **“stored in the local database”** where scientifically appropriate.
- Approximate values are explicitly identified as approximate.
- Ranges are retained when published estimates differ.
- A category definition is kept separate from a specific nearest-known example.
- Missing values stay absent; Kira does not fabricate a number to fill a field.
- The source date is shown in nearest-known answers so future updates can be audited.
