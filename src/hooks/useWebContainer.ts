import { useEffect, useState } from 'react';
import { WebContainer } from '@webcontainer/api';

// Singleton instance to prevent multiple WebContainer boots
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(webcontainerInstance);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    async function initWebContainer() {
      try {
        // Return existing instance if already booted
        if (webcontainerInstance) {
          setWebcontainer(webcontainerInstance);
          return;
        }

        // If boot is in progress, wait for it
        if (bootPromise) {
          const instance = await bootPromise;
          setWebcontainer(instance);
          return;
        }

        // Boot new instance with timeout
        console.log('🚀 Booting WebContainer...');
        bootPromise = WebContainer.boot();

        // Race between boot and a 30-second timeout
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('WebContainer boot timed out after 30 seconds. This usually means the required Cross-Origin headers are missing.')), 30000)
        );

        const instance = await Promise.race([bootPromise, timeout]);
        webcontainerInstance = instance;
        setWebcontainer(instance);
        console.log('✅ WebContainer booted successfully');
      } catch (error) {
        console.error('❌ Failed to boot WebContainer:', error);
        bootPromise = null; // Reset on error to allow retry

        const message = error instanceof Error ? error.message : 'Unknown error';
        if (message.includes('Cross-Origin') || message.includes('SharedArrayBuffer')) {
          setBootError('WebContainer requires Cross-Origin Isolation headers (COOP/COEP). These may not be configured on the hosting platform.');
        } else if (message.includes('timed out')) {
          setBootError(message);
        } else {
          setBootError(`Failed to initialize preview environment: ${message}`);
        }
      }
    }

    initWebContainer();
  }, []);

  const retry = () => {
    setBootError(null);
    bootPromise = null;
    webcontainerInstance = null;
    setWebcontainer(null);
    // Trigger re-render which will call useEffect again
    // We need a state change to trigger useEffect
    setTimeout(() => {
      setBootError(null); // This triggers re-render
    }, 0);
  };

  return { webcontainer, bootError, retry };
}
