# Bootstrap Pattern Implementation 🚀

## Problema Risolto

Il precedente pattern di routing iniziale aveva una race condition: il router poteva tentare di navigare prima che:
1. Il router di Expo fosse completamente inizializzato
2. I dati fossero caricati da AsyncStorage

Questo causava comportamenti imprevedibili e potenziali crash.

## Soluzione Implementata

### 1. AppContext con `isBootstrapped`

**File:** `/app/frontend/app/contexts/AppContext.tsx`

```typescript
interface AppContextType {
  // ... altri campi
  isBootstrapped: boolean;  // ✨ NUOVO
  // ...
}

const [isBootstrapped, setIsBootstrapped] = useState<boolean>(false);

const loadSavedData = async () => {
  try {
    // Load data from AsyncStorage...
  } catch (error) {
    console.error('Error loading saved data:', error);
  } finally {
    // ✨ CRITICO: Sempre settare a true dopo il caricamento
    setIsBootstrapped(true);
  }
};
```

### 2. Index.tsx con Guardie Multiple

**File:** `/app/frontend/app/index.tsx`

```typescript
import { useRootNavigationState } from 'expo-router';

export default function Index() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { hasCompletedOnboarding, isBootstrapped } = useAppContext();

  useEffect(() => {
    // ✅ Guardia 1: Router non pronto
    if (!navigationState?.key) return;
    
    // ✅ Guardia 2: Dati non caricati
    if (!isBootstrapped) return;

    // ✅ Safe: Ora possiamo navigare
    if (!hasCompletedOnboarding) {
      router.replace('/onboarding/welcome');
    } else {
      router.replace('/(tabs)/oggi');
    }
  }, [navigationState?.key, isBootstrapped, hasCompletedOnboarding]);

  return <ActivityIndicator />;
}
```

## Benefici

### ✅ Previene Race Conditions
- Router aspetta la sua completa inizializzazione
- Dati sono garantiti caricati prima della navigazione

### ✅ UX Migliorata
- Loading state visibile durante bootstrap
- Nessun flash di schermate sbagliate
- Comportamento deterministico

### ✅ Debug Più Facile
- Chiaro quale stato sta bloccando la navigazione
- Log facilmente inseribili per troubleshooting

### ✅ Scalabile
- Facile aggiungere altri check di bootstrap
- Pattern riutilizzabile per altri router

## Flow Sequence

```
1. App Start
   ↓
2. AppProvider monta
   ↓
3. loadSavedData() eseguito
   ↓
4. AsyncStorage letto (async)
   ↓
5. isBootstrapped = true (in finally)
   ↓
6. Index.tsx rileva isBootstrapped
   ↓
7. Index.tsx rileva navigationState.key
   ↓
8. Navigation eseguita ✅
```

## Best Practices

### ✅ DO:
- Sempre settare `isBootstrapped = true` nel `finally` block
- Controllare `navigationState?.key` prima di navigare
- Usare `router.replace()` per evitare back button
- Dipendenze complete nell'array di `useEffect`

### ❌ DON'T:
- Non navigare senza controllare `isBootstrapped`
- Non assumere che AsyncStorage sia sincrono
- Non saltare il controllo di `navigationState?.key`
- Non usare `router.push()` per routing iniziale

## Testing

Per testare questo pattern:

1. **Test Bootstrap Lento:**
   ```typescript
   const loadSavedData = async () => {
     await new Promise(resolve => setTimeout(resolve, 2000)); // Simula slow load
     setIsBootstrapped(true);
   };
   ```

2. **Test Fresh Install:**
   - Cancella AsyncStorage
   - Riavvia app
   - Dovrebbe mostrare onboarding

3. **Test Returning User:**
   - Completa onboarding
   - Chiudi e riapri app
   - Dovrebbe mostrare tabs direttamente

## Migration Notes

Se aggiungi nuovi dati da caricare all'avvio:

```typescript
const loadSavedData = async () => {
  try {
    const [user, guest, onboarding, screening, newData] = await Promise.all([
      AsyncStorage.getItem('user'),
      AsyncStorage.getItem('isGuest'),
      AsyncStorage.getItem('hasCompletedOnboarding'),
      AsyncStorage.getItem('screeningResult'),
      AsyncStorage.getItem('newData'), // ✨ Nuovo
    ]);
    
    // Process all data...
    
  } finally {
    setIsBootstrapped(true); // Ancora nel finally!
  }
};
```

## Conclusione

Questo pattern è industry-standard per gestire l'inizializzazione asincrona in React Native apps con Expo Router. È robusto, testabile e scalabile.

---

**Implementato:** 2026-02-21  
**Pattern Source:** Expo Router Best Practices  
**Status:** ✅ Production Ready
