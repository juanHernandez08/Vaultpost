// __tests__/crypto.test.ts
import { encrypt, decrypt } from '@/lib/crypto'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, ENCRYPTION_KEY: 'test-key-for-jest-32-chars-padded!' }
})

afterEach(() => {
  process.env = ORIGINAL_ENV
})

test('encrypt devuelve string diferente al original', () => {
  const result = encrypt('mi-contraseña-secreta')
  expect(result).not.toBe('mi-contraseña-secreta')
  expect(result).toContain(':')
})

test('encrypt + decrypt recupera el texto original', () => {
  const original = 'mi-contraseña-secreta'
  const encrypted = encrypt(original)
  const decrypted = decrypt(encrypted)
  expect(decrypted).toBe(original)
})

test('dos llamadas a encrypt producen resultados diferentes (IV aleatorio)', () => {
  const a = encrypt('mismo-texto')
  const b = encrypt('mismo-texto')
  expect(a).not.toBe(b)
})

test('decrypt con texto malformado lanza error', () => {
  expect(() => decrypt('no-es-formato-valido')).toThrow()
})
