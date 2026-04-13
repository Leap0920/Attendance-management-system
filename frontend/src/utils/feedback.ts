/**
 * Global feedback utility to avoid using browser alert() and confirm().
 * Dispatches custom events that are caught by DashboardLayout.
 */

export const showAlert = (title: string, message: string, type: 'alert' | 'error' | 'success' = 'alert') => {
  window.dispatchEvent(new CustomEvent('ff-alert', { 
    detail: { title, message, type } 
  }));
};

export const showConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel?: string) => {
  window.dispatchEvent(new CustomEvent('ff-confirm', { 
    detail: { title, message, onConfirm, confirmLabel } 
  }));
};

// Also export a helper for API errors
export const showApiError = (err: any, fallback = 'An unexpected error occurred') => {
  const message = err.response?.data?.message || err.message || fallback;
  showAlert('Error', message, 'error');
};
