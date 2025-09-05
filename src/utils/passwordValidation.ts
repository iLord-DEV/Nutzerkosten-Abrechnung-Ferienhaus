export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Mindestlänge: 8 Zeichen
  if (password.length < 8) {
    errors.push('Das Passwort muss mindestens 8 Zeichen lang sein');
  } else {
    score += 20;
  }

  // Großbuchstaben
  if (!/[A-Z]/.test(password)) {
    errors.push('Das Passwort muss mindestens einen Großbuchstaben enthalten');
  } else {
    score += 20;
  }

  // Kleinbuchstaben
  if (!/[a-z]/.test(password)) {
    errors.push('Das Passwort muss mindestens einen Kleinbuchstaben enthalten');
  } else {
    score += 20;
  }

  // Zahlen
  if (!/[0-9]/.test(password)) {
    errors.push('Das Passwort muss mindestens eine Zahl enthalten');
  } else {
    score += 20;
  }

  // Sonderzeichen
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Das Passwort muss mindestens ein Sonderzeichen enthalten (!@#$%^&*...)');
  } else {
    score += 20;
  }

  // Zusätzliche Punkte für Länge
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Zusätzliche Punkte für Vielfalt
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 8) score += 10;

  // Stärke-Bewertung
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score < 50) strength = 'weak';
  else if (score < 70) strength = 'medium';
  else if (score < 90) strength = 'strong';
  else strength = 'very-strong';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(score, 100)
  };
}

export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case 'weak': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'strong': return 'bg-blue-500';
    case 'very-strong': return 'bg-green-500';
    default: return 'bg-gray-300';
  }
}

export function getPasswordStrengthText(strength: string): string {
  switch (strength) {
    case 'weak': return 'Schwach';
    case 'medium': return 'Mittel';
    case 'strong': return 'Stark';
    case 'very-strong': return 'Sehr stark';
    default: return 'Unbekannt';
  }
}
