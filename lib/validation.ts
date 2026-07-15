// lib/validation.ts
// Reglas de validación compartidas entre cliente y servidor

export const PASSWORD_ERROR =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'

export function validatePassword(password: string): string | null {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return PASSWORD_ERROR
  }
  return null
}
