# IOBIO Compass – Benessere Olistico 🌿

## Panoramica
App mobile cross-platform per il benessere olistico con screening personalizzato, piano 30 giorni, e AI Coach.

## Caratteristiche Principali ✨

### 1. Onboarding
- Schermata di benvenuto con disclaimer
- Login/Registrazione con email
- Modalità Guest (dati salvati localmente)
- Consenso privacy

### 2. Screening Olistico
- **7 Aree di Benessere:**
  - Energia ⚡
  - Sonno 🌙
  - Stress 😌
  - Movimento 🚶
  - Alimentazione 🥗
  - Pelle 💧
  - Equilibrio mentale 💚

- **5 domande per area** (scala 1-5)
- **Calcolo Indice IOBIO** (0-100)
- **Radar Chart** per visualizzare tutte le aree
- **Identificazione delle 3 aree più deboli**

### 3. Piano 30 Giorni
- Micro-abitudini giornaliere personalizzate
- Basate sulle aree più deboli
- Checkbox per completare i task
- Progress tracking

### 4. Tab Navigation (4 Tabs)

#### 📅 Oggi
- Check-in giornaliero (1 minuto)
- Valutazione energia, umore, sonno
- Task giornalieri
- Visualizzazione Indice IOBIO

#### 🗺️ Mappa
- Visualizzazione metaforica del percorso
- Radar chart delle 7 aree
- Trend ultimi 7 giorni
- Fasi del viaggio: Semina → Crescita → Fioritura

#### 💬 AI Coach
- Chat assistant AI-powered
- Consigli personalizzati sul benessere
- Risposte in italiano
- Safety message per sintomi gravi
- Fallback responses quando budget LLM esaurito

#### 👤 Profilo
- Statistiche personali
- Rifai screening
- Visualizza piano 30 giorni
- Impostazioni
- Logout

### 5. Persistenza Dati
- **Utenti registrati:** MongoDB
- **Utenti guest:** AsyncStorage (locale)

## Stack Tecnologico 🛠️

### Frontend
- **Framework:** Expo (React Native)
- **Routing:** expo-router (file-based)
- **Navigation:** @react-navigation/bottom-tabs
- **Charts:** victory-native, @shopify/react-native-skia
- **State:** React Context API
- **Storage:** @react-native-async-storage/async-storage
- **Forms:** react-hook-form
- **UI:** Ionicons, react-native-safe-area-context

### Backend
- **Framework:** FastAPI
- **Database:** MongoDB (Motor async driver)
- **Auth:** bcrypt per password hashing
- **AI:** Emergent LLM Key (OpenAI GPT-5.2)
- **Integration:** emergentintegrations library

## Struttura File Frontend 📁

```
/app/frontend/app/
├── _layout.tsx                 # Root layout con AppProvider
├── index.tsx                   # Entry point (routing logic)
├── contexts/
│   └── AppContext.tsx          # Global state management
├── onboarding/
│   ├── _layout.tsx
│   ├── welcome.tsx             # Welcome screen
│   ├── auth.tsx                # Login/Register/Guest
│   └── privacy.tsx             # Privacy consent
├── screening/
│   ├── _layout.tsx
│   ├── questionnaire.tsx       # 7 aree × 5 domande
│   └── results.tsx             # Radar chart + risultati
└── (tabs)/
    ├── _layout.tsx             # Tab navigation
    ├── oggi.tsx                # Daily tasks + check-in
    ├── mappa.tsx               # Journey visualization
    ├── aicoach.tsx             # AI chat
    └── profilo.tsx             # Profile settings
```

## API Endpoints 🔌

### Auth
- `POST /api/register` - Registrazione utente
- `POST /api/login` - Login utente

### Screening
- `POST /api/screening/submit` - Invio screening
- `GET /api/screening/latest?user_id={id}` - Ultimo screening

### Piano 30 Giorni
- `GET /api/piano/tasks?user_id={id}` - Get task (30)
- `POST /api/piano/complete` - Completa task

### Check-in
- `POST /api/checkin/submit` - Invio check-in giornaliero
- `GET /api/checkin/history?user_id={id}&days={n}` - Storico

### AI Coach
- `POST /api/chat` - Chat con AI (con fallback se budget esaurito)

## Design System 🎨

### Colori
- **Primary:** #7CB342 (Verde naturale)
- **Background:** #F5F5DC (Beige chiaro)
- **Text:** #4A4A4A (Grigio scuro)
- **White:** #FFFFFF
- **Warning:** #FFA726 (Arancione)
- **Error:** #EF5350 (Rosso)

### Typography
- **Titoli:** Bold, 32-36px
- **Sottotitoli:** 16-20px
- **Body:** 14-16px
- **Icons:** Ionicons

### Spacing
- 8pt grid system (8, 16, 24, 32px)
- Border radius: 12-16px per card
- Shadow: elevation 2-3 per depth

## Funzionalità AI 🤖

### AI Coach
- **Modello:** OpenAI GPT-5.2 via Emergent LLM Key
- **Contesto:** Utilizza risultati screening per personalizzazione
- **Safety:** Rileva keywords pericolose e fornisce supporto appropriato
- **Fallback:** Risposte predefinite quando budget LLM esaurito
- **Lingua:** Risposte sempre in italiano

### Safety Keywords
- Rilevamento di: suicid*, depress grave, panico, autolesion*, etc.
- Risposta empatica con raccomandazione di aiuto professionale
- Numero emergenza: 112

## Testing ✅

### Backend (Tutti gli endpoint testati e funzionanti)
- ✅ Registrazione e login
- ✅ Screening submission e calcolo Indice IOBIO
- ✅ Generazione piano 30 giorni
- ✅ Check-in giornaliero
- ✅ AI Chat con fallback
- ✅ Serializzazione MongoDB ObjectId risolta

## Avvio Applicazione 🚀

### Backend
```bash
cd /app/backend
sudo supervisorctl restart backend
```

### Frontend
```bash
cd /app/frontend
sudo supervisorctl restart expo
```

### Database
MongoDB è già in esecuzione sulla porta 27017

## Note Importanti 📝

1. **Modalità Guest:** I dati sono salvati solo localmente su AsyncStorage
2. **Modalità Registrato:** Tutti i dati persistono su MongoDB
3. **AI Coach:** Budget LLM limitato, ma fallback garantisce sempre risposta
4. **Disclaimer:** L'app non fornisce diagnosi mediche
5. **Privacy:** Dati guest non sincronizzati, utenti registrati possono cancellare account

## Prossimi Passi Suggeriti 🔮

1. Test frontend con Expo Go app
2. Aggiungere notifiche push per reminder giornalieri
3. Esportazione dati utente (GDPR compliance)
4. Gamification (badge, streak)
5. Condivisione progressi social
6. Integrazione con Apple Health / Google Fit

---

**Versione:** 1.0.0  
**Lingua:** Italiano  
**Piattaforme:** iOS, Android, Web
