// Toast notification system
const MAX_TOASTS = 5;
const TOAST_DURATION = 3000;

let actionLog: HTMLElement | null = null;

function getActionLog(): HTMLElement {
  if (!actionLog) {
    actionLog = document.getElementById('action-log');
    if (!actionLog) {
      throw new Error('Action log container not found');
    }
  }
  return actionLog;
}

export function showToast(message: string): void {
  const container = getActionLog();

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  // Add to container
  container.appendChild(toast);

  // Enforce max toasts (remove oldest if exceeded)
  const toasts = container.querySelectorAll('.toast');
  if (toasts.length > MAX_TOASTS) {
    toasts[0].remove();
  }

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, TOAST_DURATION);
}

// Expose for testing
(window as any).__toastTest = {
  showToast,
};
