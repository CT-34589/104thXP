import { writeFile } from 'node:fs/promises'

const outputPath = new URL('../public/data/leaderboard.json', import.meta.url)
const callsignPrefixes = [
  'Aero', 'Ash', 'Atlas', 'Blaze', 'Bolt', 'Cipher', 'Comet', 'Dagger',
  'Drift', 'Ember', 'Falcon', 'Flint', 'Frost', 'Ghost', 'Havoc', 'Hunter',
  'Ion', 'Javelin', 'Kestrel', 'Lancer', 'Mako', 'Nova', 'Onyx', 'Oracle',
  'Phantom', 'Ranger', 'Raptor', 'Recoil', 'Rook', 'Sabre', 'Scout', 'Shade',
  'Shock', 'Slate', 'Spectre', 'Strike', 'Talon', 'Titan', 'Vanguard', 'Viper',
  'Warden', 'Wolf', 'Wraith', 'Zenith',
]
const callsignSuffixes = [
  'Actual', 'Alpha', 'Bravo', 'Echo', 'Five', 'Four', 'Lead', 'Nine',
  'One', 'Seven', 'Six', 'Three', 'Two', 'Zero',
]
const platforms = ['pc', 'ps', 'xbox']

function seededUnit(index) {
  // Stable pseudo-random value so regenerated demo data does not unexpectedly change.
  const value = Math.sin(index * 12_989.31 + 78.233) * 43_758.5453
  return value - Math.floor(value)
}

const players = Array.from({ length: 1000 }, (_, index) => {
  const memberNumber = index + 1
  const cloneNumber = 1000 + ((memberNumber * 7919) % 9000)
  const prefix = callsignPrefixes[index % callsignPrefixes.length]
  const suffix = callsignSuffixes[Math.floor(index / callsignPrefixes.length) % callsignSuffixes.length]
  const curve = Math.pow(seededUnit(memberNumber), 1.65)
  const xp = Math.round((25_000 + curve * 7_900_000) / 250) * 250

  return {
    id: `trooper-${String(memberNumber).padStart(4, '0')}`,
    displayName: `CT-${cloneNumber}`,
    callsign: `${prefix} ${suffix}`,
    platform: platforms[index % platforms.length],
    xp,
  }
})

const leaderboard = {
  lastUpdated: '2026-07-09T12:00:00.000Z',
  season: 'Season 1 Demo',
  players,
}

await writeFile(outputPath, `${JSON.stringify(leaderboard, null, 2)}\n`)
console.log(`Generated ${players.length} demo members in ${outputPath.pathname}`)
