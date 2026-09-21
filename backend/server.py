from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
import random
from anthropic import AsyncAnthropic

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Claude (chiamata diretta, sostituisce emergentintegrations)
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
ANTHROPIC_MODEL = os.environ.get('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001')
anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===== MODELS =====

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GuestScreening(BaseModel):
    indice_iobio: int
    area_scores: Dict[str, int]
    weak_areas: List[str]
    date: Optional[str] = None  # ISO 8601

class GuestTask(BaseModel):
    day: int
    task: str
    area: str
    completed: bool = False
    optional: bool = False

class GuestData(BaseModel):
    """Tutto quello che un Guest ha costruito sul dispositivo, da portare nel nuovo account."""
    screenings: List[GuestScreening] = []
    tasks: List[GuestTask] = []
    start_date: Optional[str] = None
    banked_stars: int = 0
    cycles: int = 0

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    guest_data: Optional[GuestData] = None  # presente quando un Guest salva i suoi progressi

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str

class ScreeningAnswer(BaseModel):
    question_id: str
    area: str
    answer: int  # 1-5
    scale_type: str  # frequency, quality, intensity
    polarity: str  # positive, negative
    weight: float  # importance weight

class ScreeningSubmit(BaseModel):
    user_id: Optional[str] = None
    answers: List[ScreeningAnswer]
    # Piano "a scorrimento": quanti giorni gia' vissuti del ciclo in corso restano
    # com'erano (0 = si apre un nuovo ciclo da capo). Solo per utenti registrati.
    keep_until_day: int = 0
    # Stelle del ciclo che si chiude, da mettere in cassaforte (solo con keep_until_day=0)
    closing_stars: int = 0

class PianoStart(BaseModel):
    user_id: str
    start_date: str  # ISO 8601

class ScreeningResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    answers: List[Dict[str, Any]]
    indice_iobio: int
    area_scores: Dict[str, int]
    weak_areas: List[str]
    date: datetime = Field(default_factory=datetime.utcnow)

class CheckInSubmit(BaseModel):
    user_id: Optional[str] = None
    energia: int  # 1-5
    umore: int  # 1-5
    sonno: int  # 1-5

class CheckIn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    energia: int
    umore: int
    sonno: int
    date: datetime = Field(default_factory=datetime.utcnow)

class PianoTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    day: int  # 1-30
    task: str
    area: str
    completed: bool = False
    optional: bool = False  # True = "extra" task beyond the day's minimum required
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TaskComplete(BaseModel):
    task_id: str
    completed: bool

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    message: str

class ChatResponse(BaseModel):
    response: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ===== HELPER FUNCTIONS =====

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def calculate_indice_iobio(answers: List[ScreeningAnswer]) -> tuple[int, Dict[str, int], List[str]]:
    """
    Calculate Indice IOBIO (0-100) with polarity and weight support.

    Scoring logic:
    - Positive polarity: score = (answer - 1) / 4 * 100 (1-5 → 0-100)
    - Negative polarity: inverted score = (5 - answer) / 4 * 100
    - Weight: multiplier for question importance
    """
    area_scores = {}
    area_weights = {}

    for answer in answers:
        area = answer.area
        raw_value = answer.answer  # 1-5
        weight = answer.weight
        polarity = answer.polarity

        # Calculate normalized score (0-100)
        if polarity == 'positive':
            # Higher answer = better score
            normalized_score = (raw_value - 1) / 4 * 100
        else:  # negative polarity
            # Higher answer = worse score, so invert
            normalized_score = (5 - raw_value) / 4 * 100

        # Apply weight
        weighted_score = normalized_score * weight

        # Accumulate by area
        if area not in area_scores:
            area_scores[area] = []
            area_weights[area] = []

        area_scores[area].append(weighted_score)
        area_weights[area].append(weight)

    # Calculate weighted average for each area
    area_averages = {}
    for area in area_scores:
        total_weighted_score = sum(area_scores[area])
        total_weight = sum(area_weights[area])
        area_averages[area] = int(total_weighted_score / total_weight)

    # Calculate overall Indice IOBIO (weighted average of all areas)
    indice_iobio = int(sum(area_averages.values()) / len(area_averages))

    # Find 3 weakest areas
    sorted_areas = sorted(area_averages.items(), key=lambda x: x[1])
    weak_areas = [area for area, _ in sorted_areas[:3]]

    return indice_iobio, area_averages, weak_areas

def get_phase_for_day(day: int, total_areas: int) -> dict:
    """Progressive phases (inspired by the '10-20 ramp' and BJ Fogg's Tiny Habits):
    start with just 1 required action and ramp up gradually instead of demanding
    everything from day 1."""
    def cap(n: int) -> int:
        return max(1, min(n, total_areas))

    if day <= 7:
        return {"key": "aggancio", "label": "Settimana 1 · Aggancio", "min_required": cap(1)}
    if day <= 14:
        return {"key": "consolidamento", "label": "Settimana 2 · Consolidamento", "min_required": cap(2)}
    if day <= 21:
        return {"key": "automatismo", "label": "Settimana 3 · Automatismo", "min_required": cap(2)}
    return {"key": "mantenimento", "label": "Settimana 4 · Mantenimento", "min_required": cap(3)}


async def generate_piano_tasks(weak_areas: List[str], user_id: Optional[str] = None) -> List[PianoTask]:
    """Generate 30 days of micro-habits based on weak areas with robust fallback.

    Each day offers one task option per weak area (normally 3): the user chooses which
    to complete. The number of options required to "succeed" the day ramps up over the
    month (see get_phase_for_day), instead of forcing all of them from day 1."""

    # GUARDRAIL A: Ensure weak_areas is never empty
    if not weak_areas or len(weak_areas) == 0:
        weak_areas = ["stress", "sonno", "energia"]  # Default fallback
        print("TASK_FALLBACK_USED", {"reason": "weak_areas_empty", "fallback": weak_areas})

    task_templates = {
        "energia": [
            "Fai 5 minuti di stretching al risveglio",
            "Bevi un bicchiere d'acqua appena sveglio",
            "Esci all'aria aperta per 10 minuti",
            "Fai una pausa di 5 minuti ogni 2 ore",
            "Mangia uno snack energetico a metà mattina",
            "Evita caffeina dopo le 15:00",
            "Fai 10 respiri profondi durante la giornata",
            "Prendi il sole per 15 minuti",
            "Ascolta musica energizzante per 10 minuti",
            "Fai una breve passeggiata dopo pranzo",
            "Fai una doccia rivitalizzante al mattino",
            "Apri le tende appena sveglio per la luce naturale",
            "Fai 2 minuti di jumping jack per svegliarti",
            "Prepara la colazione la sera prima per non correre",
            "Alzati e stiracchiati ogni ora di lavoro"
        ],
        "sonno": [
            "Vai a letto alla stessa ora",
            "Spegni gli schermi 30 minuti prima di dormire",
            "Leggi 10 pagine di un libro rilassante",
            "Prepara la camera per la notte (buio, fresco)",
            "Fai un bagno caldo serale",
            "Evita pasti pesanti dopo le 20:00",
            "Pratica 5 minuti di meditazione serale",
            "Scrivi 3 cose positive della giornata",
            "Bevi una tisana rilassante",
            "Fai stretching leggero prima di dormire",
            "Metti il telefono in un'altra stanza la sera",
            "Fai una doccia tiepida prima di coricarti",
            "Scrivi la lista delle cose da fare domani per liberare la mente",
            "Riduci le luci in casa un'ora prima di dormire",
            "Evita alcol nella serata"
        ],
        "stress": [
            "Pratica 2 minuti di respirazione profonda",
            "Scrivi i tuoi pensieri per 5 minuti",
            "Ascolta musica rilassante per 10 minuti",
            "Fai una pausa consapevole senza multitasking",
            "Esci per una camminata di 15 minuti",
            "Chiama un amico per 10 minuti",
            "Pratica la gratitudine: annota 3 cose positive",
            "Fai stretching per rilassare le tensioni",
            "Disconnettiti dai social per 1 ora",
            "Dedica 10 minuti a un hobby che ami",
            "Fai una lista delle priorità del giorno",
            "Prova la tecnica di respirazione 4-7-8",
            "Concediti 5 minuti di silenzio senza distrazioni",
            "Scrivi su carta un pensiero negativo per ridimensionarlo",
            "Fai una risata guardando qualcosa di divertente"
        ],
        "movimento": [
            "Cammina per 10 minuti",
            "Fai 10 squat durante una pausa",
            "Prendi le scale invece dell'ascensore",
            "Fai stretching per 5 minuti",
            "Balla per 5 minuti su una canzone che ami",
            "Fai una passeggiata dopo cena",
            "Pratica yoga per 10 minuti",
            "Fai 5 minuti di esercizi a corpo libero",
            "Alzati e muoviti ogni ora",
            "Prova un nuovo sport per 15 minuti",
            "Fai 5000 passi oggi",
            "Parcheggia più lontano e cammina un po' di più",
            "Fai 10 minuti di camminata veloce",
            "Fai qualche piegamento durante la giornata",
            "Fai una sessione di bici o camminata all'aperto"
        ],
        "alimentazione": [
            "Mangia una porzione di verdura a pranzo",
            "Bevi 8 bicchieri d'acqua, distribuiti dalla mattina alla sera",
            "Fai uno snack con frutta fresca e qualche mandorla o noce, per non far salire troppo la glicemia",
            "Prepara un pasto sano con ingredienti freschi",
            "Evita cibi processati oggi",
            "Mangia consapevolmente senza distrazioni",
            "Aggiungi alla colazione una fonte proteica sana (uova, yogurt greco, frutta secca o legumi)",
            "Riduci lo zucchero raffinato",
            "Prova una nuova ricetta salutare",
            "Mangia noci o semi come snack",
            "Fai la spesa con una lista per evitare acquisti impulsivi",
            "Mastica lentamente ad ogni pasto",
            "Sostituisci una bevanda zuccherata con acqua o tisana",
            "Porta con te uno snack sano fuori casa",
            "Aggiungi una nuova verdura alla tua dieta"
        ],
        "pelle": [
            "Applica crema idratante mattina e sera",
            "Bevi acqua regolarmente durante il giorno",
            "Usa protezione solare",
            "Detergi il viso mattina e sera",
            "Mangia cibi ricchi di antiossidanti",
            "Evita di toccarti il viso",
            "Dormi su una federa pulita",
            "Fai uno scrub delicato",
            "Applica una maschera idratante",
            "Limita l'esposizione allo stress",
            "Bevi un tè verde ricco di antiossidanti",
            "Cambia la federa del cuscino questa settimana",
            "Applica il contorno occhi prima di dormire",
            "Evita docce troppo calde che seccano la pelle",
            "Prenditi 5 minuti per un automassaggio al viso"
        ],
        "equilibrio_mentale": [
            "Medita per 5 minuti al mattino",
            "Scegli un'attività qualsiasi (mangiare, camminare, lavarti i denti) e falla concentrandoti solo su di essa, senza distrazioni",
            "Scrivi una sola frase che racchiude come ti senti in questo momento",
            "Guardati allo specchio e dì 3 affermazioni positive su di te: una sul fisico, una sul carattere, una su un tuo traguardo",
            "Disconnettiti dai social per 2 ore",
            "Pratica la gratitudine",
            "Leggi qualcosa di ispirazionale",
            "Ascolta un podcast motivazionale",
            "Passa tempo nella natura",
            "Pratica il perdono verso te stesso",
            "Fai 3 respiri consapevoli prima di iniziare la giornata",
            "Scrivi una cosa che ti rende orgoglioso/a di te",
            "Concediti una pausa senza sensi di colpa",
            "Sorridi a te stesso/a allo specchio",
            "Condividi un pensiero con una persona di fiducia"
        ]
    }

    generic_fallback = [
        "Fai 5 minuti di respirazione lenta (4-6) oggi.",
        "Fai una camminata di 10 minuti a passo comodo.",
        "Bevi 1 bicchiere d'acqua in più oggi.",
        "Spegni gli schermi 30 minuti prima di dormire.",
        "Fai 2 minuti di stretching collo/spalle.",
        "Mangia una porzione di verdura oggi.",
        "Scrivi 3 cose positive della giornata.",
        "Fai una pausa di 5 minuti senza schermi.",
        "Pratica la gratitudine per 2 minuti.",
        "Vai a letto alla stessa ora stasera."
    ]

    # GUARDRAIL B: Normalize area names and keep only the ones we have templates for
    normalized_areas = []
    for area in weak_areas[:3]:
        area_lower = area.lower().replace(" ", "_")
        if area_lower in task_templates:
            normalized_areas.append(area_lower)
            print(f"PIANO_AREA_MATCHED: {area} -> {area_lower}")
        else:
            print(f"PIANO_AREA_NOT_FOUND: {area} (normalized: {area_lower})")

    if not normalized_areas:
        normalized_areas = ["__fallback__"]
        task_templates["__fallback__"] = generic_fallback
        print("TASK_FALLBACK_USED", {"weak_areas": weak_areas, "reason": "no_area_matched"})

    print(f"PIANO_AREAS_USED: {normalized_areas}")

    # GUARDRAIL C: Generate day-by-day, one task option per area, cycling each area's
    # own pool independently so the same task doesn't repeat for as long as possible.
    area_cursor = {area: 0 for area in normalized_areas}
    tasks = []
    for day_num in range(1, 31):  # Days 1-30
        phase = get_phase_for_day(day_num, len(normalized_areas))

        for idx, area in enumerate(normalized_areas):
            pool = task_templates[area]
            task_text = pool[area_cursor[area] % len(pool)]
            area_cursor[area] += 1

            task = PianoTask(
                user_id=user_id,
                day=day_num,
                task=task_text,
                area=area,
                optional=idx >= phase["min_required"],
            )
            tasks.append(task)

    return tasks

def parse_client_date(value: Optional[str]) -> Optional[datetime]:
    """ISO 8601 dal client (JS o Python) -> datetime naive in UTC, come il resto del database."""
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed

async def delete_user_progress(user_id: str):
    """Cancella tutto cio' che riguarda i progressi di un utente (non l'account)."""
    for collection in (db.screenings, db.piano_tasks, db.checkins, db.piano_state, db.chat_history):
        await collection.delete_many({"user_id": user_id})

async def migrate_guest_data(user_id: str, guest: GuestData):
    """Porta nel nuovo account lo storico screening, il piano con le spunte, la data di
    inizio e la cassaforte stelle costruiti da Guest sul dispositivo."""
    if len(guest.screenings) > 100 or len(guest.tasks) > 300:
        raise HTTPException(status_code=400, detail="Dati da trasferire non validi")

    screening_docs = [
        ScreeningResult(
            user_id=user_id,
            answers=[],  # le singole risposte non sono conservate sul dispositivo
            indice_iobio=s.indice_iobio,
            area_scores=s.area_scores,
            weak_areas=s.weak_areas,
            date=parse_client_date(s.date) or datetime.utcnow(),
        ).dict()
        for s in guest.screenings
    ]
    if screening_docs:
        await db.screenings.insert_many(screening_docs)

    task_docs = [
        PianoTask(
            user_id=user_id,
            day=t.day,
            task=t.task[:300],
            area=t.area,
            completed=t.completed,
            optional=t.optional,
        ).dict()
        for t in guest.tasks
        if 1 <= t.day <= 30
    ]
    if task_docs:
        await db.piano_tasks.insert_many(task_docs)

    state: Dict[str, Any] = {}
    start = parse_client_date(guest.start_date)
    if start:
        state["start_date"] = start.isoformat() + "Z"
    if guest.banked_stars > 0:
        state["banked_stars"] = min(guest.banked_stars, 5000)
        state["cycles"] = max(0, min(guest.cycles, 100))
    if state:
        await db.piano_state.update_one({"user_id": user_id}, {"$set": state}, upsert=True)

# ===== ROUTES =====

@api_router.post("/register", response_model=UserResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")

    # Create user
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )

    # Un Guest che salva i progressi porta con se' i suoi dati. Si trasferiscono PRIMA di
    # creare l'account: se qualcosa va storto si ripulisce tutto e l'utente puo' riprovare
    # con la stessa email, senza restare con un account vuoto.
    if user_data.guest_data:
        try:
            await migrate_guest_data(user.id, user_data.guest_data)
        except HTTPException:
            await delete_user_progress(user.id)
            raise
        except Exception as e:
            print(f"GUEST_MIGRATION_FAILED: {e}")
            await delete_user_progress(user.id)
            raise HTTPException(status_code=500, detail="Non siamo riusciti a trasferire i tuoi progressi. Riprova.")

    await db.users.insert_one(user.dict())

    return UserResponse(id=user.id, email=user.email)

@api_router.post("/login", response_model=UserResponse)
async def login(user_data: UserLogin):
    user_dict = await db.users.find_one({"email": user_data.email})
    if not user_dict:
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    if not verify_password(user_data.password, user_dict["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    return UserResponse(id=user_dict["id"], email=user_dict["email"])

@api_router.post("/screening/submit", response_model=ScreeningResult)
async def submit_screening(data: ScreeningSubmit):
    # Calculate scores
    indice_iobio, area_scores, weak_areas = calculate_indice_iobio(data.answers)

    # Create screening result
    result = ScreeningResult(
        user_id=data.user_id,
        answers=[answer.dict() for answer in data.answers],
        indice_iobio=indice_iobio,
        area_scores=area_scores,
        weak_areas=weak_areas
    )

    # Save to database
    await db.screenings.insert_one(result.dict())

    query = {"user_id": data.user_id} if data.user_id else {"user_id": None}

    # Piano "a scorrimento": se il ciclo e' in corso, i giorni gia' vissuti (e le stelle
    # guadagnate) restano intatti e cambiano solo quelli da oggi in poi. Vale solo per gli
    # utenti registrati e solo se quei giorni esistono davvero, altrimenti si riparte.
    keep = max(0, min(data.keep_until_day, 30)) if data.user_id else 0
    if keep > 0:
        already_lived = await db.piano_tasks.count_documents({**query, "day": {"$lte": keep}})
        if already_lived == 0:
            keep = 0

    tasks = await generate_piano_tasks(weak_areas, data.user_id)

    if keep > 0:
        delete_result = await db.piano_tasks.delete_many({**query, "day": {"$gt": keep}})
        tasks = [t for t in tasks if t.day > keep]
        print(f"PIANO_TASKS_SLID: kept days<={keep}, {delete_result.deleted_count} future tasks replaced for user_id={data.user_id}")
    else:
        if data.user_id:
            # Nuovo ciclo: le stelle di quello chiuso vanno in cassaforte, e la data di
            # inizio riparte da adesso. Tetto anti-errore: 30 giorni x 3 azioni + 25 di bonus.
            closing = max(0, min(data.closing_stars, 115))
            update: Dict[str, Any] = {"$set": {"start_date": datetime.utcnow().isoformat() + "Z"}}
            if closing > 0:
                update["$inc"] = {"banked_stars": closing, "cycles": 1}
            await db.piano_state.update_one({"user_id": data.user_id}, update, upsert=True)
        delete_result = await db.piano_tasks.delete_many(query)
        print(f"PIANO_TASKS_DELETED: {delete_result.deleted_count} tasks removed for user_id={data.user_id}")

    if tasks:  # insert_many con lista vuota darebbe errore (es. scorrimento oltre l'ultimo giorno)
        await db.piano_tasks.insert_many([task.dict() for task in tasks])
    print(f"PIANO_TASKS_CREATED: {len(tasks)} new tasks for user_id={data.user_id}")

    return result

@api_router.get("/piano/state")
async def get_piano_state(user_id: str):
    """Data di inizio del ciclo in corso e cassaforte delle stelle (cicli chiusi)."""
    state = await db.piano_state.find_one({"user_id": user_id}) or {}
    return {
        "start_date": state.get("start_date"),
        "banked_stars": state.get("banked_stars", 0),
        "cycles": state.get("cycles", 0),
    }

@api_router.post("/piano/start")
async def set_piano_start(data: PianoStart):
    """Registra la data di inizio del ciclo solo se non c'e' gia' (utenti che avevano un
    piano prima dell'introduzione di questo stato, o migrazione dal dispositivo)."""
    try:
        datetime.fromisoformat(data.start_date.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Data di inizio non valida")
    state = await db.piano_state.find_one({"user_id": data.user_id})
    if state and state.get("start_date"):
        return {"start_date": state["start_date"]}
    await db.piano_state.update_one(
        {"user_id": data.user_id}, {"$set": {"start_date": data.start_date}}, upsert=True
    )
    return {"start_date": data.start_date}

@api_router.delete("/reset")
async def reset_user_data(user_id: Optional[str] = None):
    """Cancella screening, piano tasks e check-in per un utente (o per il bucket
    'guest' condiviso se user_id e' assente/vuoto). Utile per ripulire dati di
    test/stale durante lo sviluppo - non e' esposto nell'app."""
    query = {"user_id": user_id} if user_id else {"user_id": None}
    screenings_deleted = await db.screenings.delete_many(query)
    piano_deleted = await db.piano_tasks.delete_many(query)
    checkins_deleted = await db.checkins.delete_many(query)
    await db.piano_state.delete_many(query)
    print(f"RESET_USER_DATA: user_id={user_id} screenings={screenings_deleted.deleted_count} "
          f"piano_tasks={piano_deleted.deleted_count} checkins={checkins_deleted.deleted_count}")
    return {
        "success": True,
        "user_id": user_id,
        "screenings_deleted": screenings_deleted.deleted_count,
        "piano_tasks_deleted": piano_deleted.deleted_count,
        "checkins_deleted": checkins_deleted.deleted_count,
    }

@api_router.get("/screening/latest")
async def get_latest_screening(user_id: Optional[str] = None):
    query = {"user_id": user_id} if user_id else {"user_id": None}
    screening = await db.screenings.find_one(query, sort=[("date", -1)])
    if not screening:
        return None
    # Convert ObjectId to string
    if "_id" in screening:
        screening["_id"] = str(screening["_id"])
    return screening

@api_router.get("/screening/history")
async def get_screening_history(user_id: Optional[str] = None):
    """Tutti gli screening di un utente, dal piu' vecchio al piu' recente -
    usato per la vista 'il tuo percorso' (andamento Indice IOBIO nel tempo)."""
    query = {"user_id": user_id} if user_id else {"user_id": None}
    screenings = await db.screenings.find(query).sort("date", 1).to_list(200)
    for screening in screenings:
        if "_id" in screening:
            screening["_id"] = str(screening["_id"])
        # Non serve rimandare al client tutte le risposte singole per uno storico
        screening.pop("answers", None)
    return screenings

@api_router.post("/checkin/submit", response_model=CheckIn)
async def submit_checkin(data: CheckInSubmit):
    checkin = CheckIn(
        user_id=data.user_id,
        energia=data.energia,
        umore=data.umore,
        sonno=data.sonno
    )
    await db.checkins.insert_one(checkin.dict())
    return checkin

@api_router.get("/checkin/history")
async def get_checkin_history(user_id: Optional[str] = None, days: int = 30):
    query = {"user_id": user_id} if user_id else {"user_id": None}
    start_date = datetime.utcnow() - timedelta(days=days)
    query["date"] = {"$gte": start_date}

    checkins = await db.checkins.find(query).sort("date", -1).to_list(100)
    # Convert ObjectId to string for each checkin
    for checkin in checkins:
        if "_id" in checkin:
            checkin["_id"] = str(checkin["_id"])
    return checkins

@api_router.get("/piano/tasks")
async def get_piano_tasks(user_id: Optional[str] = None):
    query = {"user_id": user_id} if user_id else {"user_id": None}
    # 30 giorni x fino a 3 opzioni al giorno = 90 task (tetto largo per sicurezza)
    tasks = await db.piano_tasks.find(query).sort("day", 1).to_list(300)
    # Convert ObjectId to string for each task
    for task in tasks:
        if "_id" in task:
            task["_id"] = str(task["_id"])
    return tasks

@api_router.post("/piano/complete")
async def complete_task(data: TaskComplete):
    result = await db.piano_tasks.update_one(
        {"id": data.task_id},
        {"$set": {"completed": data.completed}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task non trovato")
    return {"success": True}

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(data: ChatRequest):
    try:
        # Get user's latest screening for context
        screening = None
        if data.user_id:
            screening = await db.screenings.find_one(
                {"user_id": data.user_id},
                sort=[("date", -1)]
            )

        # Build context
        context = "Sei un coach di benessere olistico. Fornisci consigli semplici e pratici per migliorare il benessere. "
        context += "Non fornire mai diagnosi mediche. "
        context += "Se l'utente menziona sintomi gravi come depressione severa, pensieri autolesionistici, attacchi di panico, o altri sintomi seri, "
        context += "rispondi con empatia e raccomanda di consultare un professionista della salute mentale. "

        if screening:
            context += f"\nContesto utente: Indice IOBIO {screening['indice_iobio']}/100. "
            context += f"Aree più deboli: {', '.join(screening['weak_areas'])}. "

        # Check for safety keywords in user message
        safety_keywords = ['suicid', 'uccid', 'morte', 'morire', 'autolesion', 'depress grave', 'panico', 'ansia grave']
        if any(keyword in data.message.lower() for keyword in safety_keywords):
            safety_response = (
                "Mi dispiace che tu stia attraversando un momento difficile. "
                "È molto importante che tu parli con un professionista della salute mentale che possa offrirti il supporto adeguato. "
                "Ti consiglio di contattare il tuo medico o un servizio di supporto psicologico. "
                "In caso di emergenza, puoi chiamare il 112 o rivolgerti al pronto soccorso più vicino. "
                "La tua salute e il tuo benessere sono la priorità. 💚"
            )
            return ChatResponse(response=safety_response)

        try:
            # Chiamata diretta a Claude (nessun proxy Emergent)
            if anthropic_client is None:
                raise RuntimeError("ANTHROPIC_API_KEY non configurata")

            completion = await anthropic_client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=1024,
                system=context,
                messages=[
                    {"role": "user", "content": data.message},
                ],
            )
            response = completion.content[0].text

            # Save chat history
            await db.chat_history.insert_one({
                "user_id": data.user_id,
                "message": data.message,
                "response": response,
                "timestamp": datetime.utcnow()
            })

            return ChatResponse(response=response)

        except Exception as llm_error:
            # If LLM fails (budget exceeded, etc.), provide fallback response
            logging.error(f"LLM error: {str(llm_error)}")

            fallback_responses = [
                "Grazie per la tua domanda! Per migliorare il tuo benessere, ricorda di: fare movimento regolare, dormire bene, bere molta acqua e praticare la mindfulness. 🌿",
                "Il benessere è un viaggio! Inizia con piccoli passi: una camminata di 10 minuti, qualche respiro profondo, o semplicemente prenderti un momento per te. 💚",
                "Ricorda i pilastri del benessere: alimentazione sana, movimento, riposo adeguato, gestione dello stress e connessioni sociali positive. Su quale vuoi lavorare oggi? 🌱"
            ]

            import random
            fallback = random.choice(fallback_responses)

            return ChatResponse(response=fallback)

    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore durante la chat: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
