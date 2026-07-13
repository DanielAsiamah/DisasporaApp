const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'That email is already registered. Try signing in.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Use at least 8 characters with a letter and number.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password. Try again.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/user-disabled': 'This account has been disabled. Contact support for help.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled yet.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

export function getAuthErrorMessage(error) {
  const code = error?.code;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  return error?.message || 'Something went wrong. Please try again.';
}
