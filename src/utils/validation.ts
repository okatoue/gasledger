export function isValidVin(vin: string): boolean {
  return vin.length === 17;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true, message: '' };
}

export function doPasswordsMatch(password: string, confirm: string): boolean {
  return password === confirm;
}
