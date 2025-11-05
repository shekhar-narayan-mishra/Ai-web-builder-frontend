import { useEffect, useState } from 'react';
import { WebContainer } from '@webcontainer/api';

// Singleton instance to prevent multiple WebContainer boots
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(webcontainerInstance);

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

        // Boot new instance
        console.log('🚀 Booting WebContainer...');
        bootPromise = WebContainer.boot();
        const instance = await bootPromise;
        webcontainerInstance = instance;
        setWebcontainer(instance);
        console.log('✅ WebContainer booted successfully');
      } catch (error) {
        console.error('❌ Failed to boot WebContainer:', error);
        bootPromise = null; // Reset on error to allow retry
      }
    }

    initWebContainer();
  }, []);

  return webcontainer;
}
