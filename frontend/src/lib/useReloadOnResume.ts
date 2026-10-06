import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { msUntilNextMidnight } from './planDay';

// Ricarica i dati quando l'app torna in primo piano (dopo ore in background o con la scheda
// del browser rimasta aperta) e a mezzanotte: cosi' i task del nuovo giorno compaiono da soli
// senza dover chiudere e riaprire l'app.
export const useReloadOnResume = (reload: () => void, enabled: boolean = true) => {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const lastRun = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      lastRun.current = Date.now();
      reloadRef.current();
    };

    const subscription = AppState.addEventListener('change', state => {
      // Evita ricaricamenti a raffica se si passa da una app all'altra di continuo
      if (state === 'active' && Date.now() - lastRun.current > 30 * 1000) run();
    });

    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      timer = setTimeout(() => {
        run();
        scheduleMidnight();
      }, msUntilNextMidnight());
    };
    scheduleMidnight();

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [enabled]);
};
