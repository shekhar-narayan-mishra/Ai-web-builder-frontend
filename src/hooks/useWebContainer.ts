import { useEffect, useState } from 'react';
import { WebContainer } from '@webcontainer/api';

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null);

  useEffect(() => {
    async function initWebContainer() {
      try {
        const instance = await WebContainer.boot();
        setWebcontainer(instance);
      } catch (error) {
        console.error('Failed to boot WebContainer:', error);
      }
    }

    initWebContainer();
  }, []);

  return webcontainer;
}
