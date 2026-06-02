// Remembers which diner this device is, per shared session, so a refresh keeps
// your identity instead of re-prompting.
const key = (sessionId) => `meal-splitter-shared-user-${sessionId}`

export function getSharedUser(sessionId) {
  try {
    return localStorage.getItem(key(sessionId)) || ''
  } catch {
    return ''
  }
}

export function setSharedUser(sessionId, name) {
  try {
    localStorage.setItem(key(sessionId), name)
  } catch {
    // ignore storage failures
  }
}
