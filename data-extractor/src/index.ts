import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as moment from 'moment'

if (process.argv.length < 4) {
  console.log('Usage: node <script.js> input-path output-path type(Bullet | Blitz | Classical | Correspondence)')
  process.exit(0)
}

const RAW_KEYS = ['type', 'timestamp', 'white', 'black', 'result', 'whiteelo', 'blackelo', 'whiteratingdiff', 'blackratingdiff', 'eco', 'opening']
const ELO_KEYS = ['type', 'timestamp', 'player', 'elo', 'ratingdiff']

const INPUT_FILE = process.argv[2]
const OUTPUT_FILE = process.argv[3]

const reader = readline.createInterface({
  input: fs.createReadStream(INPUT_FILE),
})

const rawWriter = fs.createWriteStream(path.resolve(OUTPUT_FILE.replace('.tsv', `-raw.tsv`)))
rawWriter.write(`${RAW_KEYS.join('\t')}\n`)

const eloWriter = fs.createWriteStream(path.resolve(OUTPUT_FILE.replace('.tsv', `-elo.tsv`)))
eloWriter.write(`${ELO_KEYS.join('\t')}\n`)

let currentGame: {[key: string]: string} = {}

const toTsv = function(dataPoint: object, keys: string[]) {
  return `${keys.map((k) => dataPoint[k]).join('\t')}\n`
}

const writeRaw = function(currentGame) {
  const g = {...currentGame}
  rawWriter.write(toTsv(currentGame, RAW_KEYS))
}

const writeElo = function(currentGame: object) {
  const g = {...currentGame}
  eloWriter.write(toTsv({ type: g['type'], player: g['white'], timestamp: g['timestamp'], elo: g['whiteelo'], ratingdiff: g['whiteratingdiff'] }, ELO_KEYS))
  eloWriter.write(toTsv({ type: g['type'], player: g['black'], timestamp: g['timestamp'], elo: g['blackelo'], ratingdiff: g['blackratingdiff'] }, ELO_KEYS))
}

reader.on('line', (line) => {
  if (line.startsWith('[')) {
    let [, tag, value] = line.match(/\[([a-zA-Z0-9]+)\s+\"(.*)\"\]/) as string[]

    tag = tag.toLowerCase()

    if (value === '?')  {
      if (tag === 'whiteelo' || tag === 'blackelo') { value = '0' }
      else { value = '' }
    }

    if (tag === 'event') {
      value = value.replace(/Rated/gi, '')
      value = value.replace(/game/gi, '')
      value = value.replace(/\s+tournament\s.*/gi, '')
      value = value.trim()
      value = value.toLowerCase()
      tag = 'type'
    }

    if (tag === 'site') {
      currentGame[tag] = value.replace('https://lichess.org/', '')
    } else {
      currentGame[tag] = value
    }
  }

  if (line.endsWith('1-0') || line.endsWith('0-1') || line.endsWith('1/2-1/2') || line.endsWith('*')) {
    const ts = `${moment.utc(currentGame['utcdate'] + ' ' + currentGame['utctime'], 'YYYY.MM.DD HH:mm:ss').toISOString()}`
    currentGame['timestamp'] = ts
    writeRaw({...currentGame})
    writeElo({...currentGame})
    currentGame = {}
  }
})
