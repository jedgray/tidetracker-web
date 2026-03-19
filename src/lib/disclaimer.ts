// Centralised disclaimer text — single source of truth.
// Update the VERSION when content changes to re-prompt existing users.

export const DISCLAIMER_VERSION = '1.0'

export const DISCLAIMER_TITLE = 'Safety & liability disclaimer'

export const DISCLAIMER_SECTIONS = [
  {
    heading: 'Informational use only',
    body: `TideTracker provides tidal and current predictions sourced from NOAA CO-OPS harmonic data and user-contributed observations. This information is provided for general planning purposes only and does not constitute professional diving advice, navigational guidance, or a safety guarantee of any kind.`,
  },
  {
    heading: 'Predictions are not guarantees',
    body: `Tidal and current predictions are mathematical models. Actual conditions may differ significantly due to weather, wind, barometric pressure changes, local bathymetry, and other factors beyond the scope of harmonic models. User-contributed corrections improve accuracy over time but cannot eliminate uncertainty. Never rely solely on this app to make dive or navigation decisions.`,
  },
  {
    heading: 'Scuba diving is inherently dangerous',
    body: `Scuba diving involves serious risks including, but not limited to, decompression sickness, arterial gas embolism, entrapment, drowning, and encounters with strong underwater currents. You assume all risk associated with any dive you conduct. TideTracker and its operators accept no responsibility or liability for injury, death, property damage, or any other loss arising from your use of this application.`,
  },
  {
    heading: 'Community data',
    body: `If you opt in to community sharing, your anonymised dive observations (dates, site names, and slack time deltas) will be aggregated to improve predictions for other users. No personally identifiable information is shared. You may withdraw consent at any time in your account settings.`,
  },
  {
    heading: 'Always dive with a buddy and proper training',
    body: `Verify conditions independently before every dive. Check current NOAA forecasts, consult local knowledge, dive with a qualified buddy, and ensure you have appropriate certification and experience for the site and conditions. If in doubt, don't dive.`,
  },
  {
    heading: 'Acceptance',
    body: `By creating an account and using TideTracker you acknowledge that you have read, understood, and agree to these terms. You confirm that you are at least 18 years of age and accept full personal responsibility for any activities you undertake based on information provided by this application.`,
  },
]

export const DISCLAIMER_ACCEPTANCE_LABEL =
  'I have read and understand the above disclaimer. I accept all risks and agree that TideTracker is not liable for any outcome resulting from my use of this application.'
