# IOBIO Compass — repo pronto per GitHub

## Cosa ho fatto
- Estratto lo ZIP originale, struttura verificata integra (58 file tracciati).
- .gitignore corretto: backend/.env e frontend/.env ora esclusi, non finiranno mai su GitHub.
- Creati backend/.env.example e frontend/.env.example come riferimento senza segreti.
- Corretto frontend/app.json: lo splash screen puntava a un file inesistente (splash-icon.png), ora punta al file reale (splash-image.png).
- Repository git gia inizializzato con un primo commit pulito, pronto per il push.

## Prima di pushare - azione tua, obbligatoria
Rigenera la EMERGENT_LLM_KEY dal pannello Emergent. Quella attuale e comparsa in chiaro nei file caricati: anche se ora non verra mai committata, meglio non riusarla. Aggiorna il valore in backend/.env (il file reale sul tuo computer, non l'example).

## Push su GitHub (repo gia creato: lucamalaspina0103/iobio-compass)
Apri un terminale nella cartella di questo progetto ed esegui:

git remote add origin https://github.com/lucamalaspina0103/iobio-compass.git
git branch -M main
git push -u origin main

Se ti chiede autenticazione, GitHub non accetta piu la password diretta: serve un Personal Access Token (Settings - Developer settings - Personal access tokens) da usare al posto della password.

## Collegare Vercel (link pubblico per vedere i progressi)
1. Vai su vercel.com, accedi con l'account GitHub.
2. "Add New Project" - seleziona iobio-compass.
3. Root directory: frontend
4. Build command: npx expo export -p web
5. Output directory: dist
6. Deploy. Otterrai un link tipo iobio-compass.vercel.app - e la build web del frontend, utile per vedere rapidamente le modifiche, ma non riflette al 100% il comportamento su iOS/Android (alcuni moduli nativi si comportano diversamente in web).
7. Il backend resta per ora quello Emergent (compass-wellness.preview.emergentagent.com) - non l'ho toccato, e l'unica parte gia live e funzionante.

## Passaggio a Claude Code (obiettivo finale)
Una volta pushato su GitHub:

git clone https://github.com/lucamalaspina0103/iobio-compass.git
cd iobio-compass
claude

Da li Claude Code lavora direttamente sui file del repo clonato, con accesso diretto a terminale/git - e l'ambiente corretto per il lavoro di bug fixing continuativo che avevi in mente, piu solido di questa modalita per iterazioni lunghe sul codice.

## Debiti tecnici da pianificare (non urgenti, ma da mettere in roadmap)
- emergentintegrations nel backend (server.py) e una libreria proprietaria Emergent - va sostituita con chiamata diretta alle API OpenAI quando si stacca del tutto da Emergent.
- bundleIdentifier/package in app.json sono ancora com.emergent.compasswellness.m66wx0 - da cambiare prima di qualsiasi pubblicazione su App Store / Play Store.
- Backend monolitico in un solo file (server.py, 528 righe) - va bene per ora, da modularizzare se cresce ancora.
