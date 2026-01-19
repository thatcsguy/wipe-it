// Combat log system
const MAX_ENTRIES = 100;

let combatLog: HTMLElement | null = null;

function getCombatLog(): HTMLElement {
  if (!combatLog) {
    combatLog = document.getElementById('combat-log');
    if (!combatLog) {
      throw new Error('Combat log container not found');
    }
  }
  return combatLog;
}

function formatTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `[${hours}:${minutes}:${seconds}]`;
}

export function logCombat(message: string): void {
  const container = getCombatLog();

  // Create entry element
  const entry = document.createElement('div');
  entry.className = 'combat-entry';
  entry.textContent = `${formatTimestamp()} ${message}`;

  // Add to container
  container.appendChild(entry);

  // Enforce max entries (remove oldest if exceeded)
  const entries = container.querySelectorAll('.combat-entry');
  if (entries.length > MAX_ENTRIES) {
    entries[0].remove();
  }

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight - container.clientHeight;
}

// Expose for testing
(window as any).__combatLogTest = {
  log: logCombat,
};
