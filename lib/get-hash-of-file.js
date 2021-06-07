import crypto from 'crypto'
import fs from 'fs/promises'

export const getHashOfFile = async (file) => {
  const stat = await fs.stat(file).catch(() => false)

  if (!stat) return false

  const content = await fs.readFile(file, 'utf8')

  return crypto.createHash('sha256').update(content).digest('hex')
}
