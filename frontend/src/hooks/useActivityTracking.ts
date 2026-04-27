import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { activityTracker } from '../services/activityTracker';

/**
 * Hook to automatically track page views
 */
export const usePageTracking = (pageName: string) => {
  const location = useLocation();

  useEffect(() => {
    activityTracker.trackPageView(pageName, location.pathname);
  }, [pageName, location.pathname]);
};

/**
 * Hook to track clicks with easy integration
 */
export const useClickTracking = () => {
  return {
    trackClick: (elementName: string, elementType: string, data?: Record<string, any>) => {
      activityTracker.trackClick(elementName, elementType, data);
    },
  };
};

/**
 * Hook to track file access
 */
export const useFileTracking = () => {
  return {
    trackFileView: (fileName: string, fileId: number) => {
      activityTracker.trackFileAccess(fileName, fileId, 'view');
    },
    trackFileDownload: (fileName: string, fileId: number) => {
      activityTracker.trackFileAccess(fileName, fileId, 'download');
    },
    trackFileOpen: (fileName: string, fileId: number) => {
      activityTracker.trackFileAccess(fileName, fileId, 'open');
    },
  };
};

/**
 * Hook to track form submissions
 */
export const useFormTracking = () => {
  return {
    trackFormSubmit: (formName: string, formData?: Record<string, any>) => {
      activityTracker.trackFormSubmit(formName, formData);
    },
  };
};

/**
 * Hook to track search
 */
export const useSearchTracking = () => {
  return {
    trackSearch: (query: string, context: string) => {
      activityTracker.trackSearch(query, context);
    },
  };
};

/**
 * Hook to track modal opens
 */
export const useModalTracking = () => {
  return {
    trackModalOpen: (modalName: string, context?: string) => {
      activityTracker.trackModalOpen(modalName, context);
    },
  };
};
