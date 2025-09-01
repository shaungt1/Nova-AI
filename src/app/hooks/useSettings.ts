'use client';

import { useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  service: 'Google',
  model: 'gemini-2.0-flash-exp',
  googleApiKey: ''
};

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedSettings = localStorage.getItem('settings');
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          setSettings(parsed || DEFAULT_SETTINGS);
        }
      } catch (e) {
        console.error('Error parsing stored settings:', e);
        setSettings(DEFAULT_SETTINGS);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('settings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  return [settings, setSettings] as const;
} 