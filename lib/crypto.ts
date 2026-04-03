// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

function deriveKey(masterKey: string): Buffer {
  return createHash('sha256').update(masterKey).digest()
}

/**
 * Cifra un string con AES-256-GCM.
 * SOLO llamar desde el servidor (API routes). Nunca desde componentes cliente.
 * @returns string en formato "ivHex:authTagHex:ciphertextHex"
 */
export function encrypt(plaintext: string): string {
  const masterKey = process.env.ENCRYPTION_KEY
  if (!masterKey) throw new Error('ENCRYPTION_KEY no está definida en las variables de entorno')

  const key = deriveKey(masterKey)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * Descifra un string cifrado con encrypt().
 * SOLO llamar desde el servidor (API routes). Nunca desde componentes cliente.
 */
export function decrypt(encoded: string): string {
  const masterKey = process.env.ENCRYPTION_KEY
  if (!masterKey) throw new Error('ENCRYPTION_KEY no está definida en las variables de entorno')

  const parts = encoded.split(':')
  if (parts.length !== 3) throw new Error('Formato de texto cifrado inválido')

  const [ivHex, authTagHex, ciphertextHex] = parts
  const key = deriveKey(masterKey)
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}
