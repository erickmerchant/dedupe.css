import crypto from 'crypto'
import fs from 'fs'
import {promisify} from 'util'

const readFile = promisify(fs.readFile)
const fstat = promisify(fs.stat)

export const getHashOfFile = async (file) => {
  const stat = await fstat(file).catch(() => false)

  if (!stat) return false

  const content = await readFile(file, 'utf8')

  return crypto.createHash('sha256').update(content).digest('hex')
}
