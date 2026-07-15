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
from datetime import datetime, timedelta
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

class UserRegister(BaseModel):
    email: EmailStr
    password: str

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

async def generate_piano_tasks(weak_areas: List[str], user_id: Optional[str] = None) -> List[PianoTask]:
    """Generate 30 days of micro-habits based on weak areas with robust fallback"""

    # GUARDRAIL A: Ensure weak_areas is never empty
    if not weak_areas or len(weak_areas) == 0:
        weak_areas = ["stress", "sonno", "energia"]  # Default fallback
        print("TASK_FALLBACK_USED", {"reason": "weak_areas_empty", "fallback": weak_areas})

    tasks_per_area = 10  # 30 days / 3 areas = 10 tasks per area

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
            "Fai una breve passeggiata dopo pranzo"
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
            "Fai stretching leggero prima di dormire"
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
            "Dedica 10 minuti a un hobby che ami"
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
            "Prova un nuovo sport per 15 minuti"
        ],
        "alimentazione": [
            "Mangia una porzione di verdura a pranzo",
            "Bevi 8 bicchieri d'acqua",
            "Mangia frutta fresca come snack",
            "Prepara un pasto sano con ingredienti freschi",
            "Evita cibi processati oggi",
            "Mangia consapevolmente senza distrazioni",
            "Aggiungi proteine sane alla colazione",
            "Riduci lo zucchero raffinato",
            "Prova una nuova ricetta salutare",
            "Mangia noci o semi come snack"
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
            "Limita l'esposizione allo stress"
        ],
        "equilibrio_mentale": [
            "Medita per 5 minuti al mattino",
            "Pratica la mindfulness durante un'attività",
            "Scrivi un diario delle emozioni",
            "Fai affermazioni positive allo specchio",
            "Disconnettiti dai social per 2 ore",
            "Pratica la gratitudine",
            "Leggi qualcosa di ispirazionale",
            "Ascolta un podcast motivazionale",
            "Passa tempo nella natura",
            "Pratica il perdono verso te stesso"
        ]
    }

    # GUARDRAIL B: Build task_list and ensure it's never empty
    task_list = []
    matched_areas = []
    for area in weak_areas:
        # Normalize area names (handle both "energia" and "Energia", "Equilibrio mentale" etc.)
        area_lower = area.lower().replace(" ", "_")
        if area_lower in task_templates:
            task_list.extend(task_templates[area_lower])
            matched_areas.append(area_lower)
            print(f"PIANO_AREA_MATCHED: {area} -> {area_lower} ({len(task_templates[area_lower])} tasks)")
        else:
            print(f"PIANO_AREA_NOT_FOUND: {area} (normalized: {area_lower})")

    print(f"PIANO_TASK_LIST_SIZE: {len(task_list)} tasks from {len(matched_areas)} areas")

    # If task_list is still empty, use generic fallback
    if not task_list:
        task_list = [
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
        print("TASK_FALLBACK_USED", {"weak_areas": weak_areas, "reason": "empty_task_list"})

    # GUARDRAIL C: Generate exactly 30 tasks
    tasks = []
    for day_num in range(1, 31):  # Days 1-30
        # Cycle through task_list
        task_text = task_list[(day_num - 1) % len(task_list)]
        # Rotate through weak_areas for area assignment
        area = weak_areas[(day_num - 1) % len(weak_areas)]

        task = PianoTask(
            user_id=user_id,
            day=day_num,
            task=task_text,
            area=area
        )
        tasks.append(task)

    return tasks

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

    # Delete existing piano tasks for this user before generating new ones
    query = {"user_id": data.user_id} if data.user_id else {"user_id": None}
    delete_result = await db.piano_tasks.delete_many(query)
    print(f"PIANO_TASKS_DELETED: {delete_result.deleted_count} tasks removed for user_id={data.user_id}")

    # Generate piano tasks
    tasks = await generate_piano_tasks(weak_areas, data.user_id)
    for task in tasks:
        await db.piano_tasks.insert_one(task.dict())
    print(f"PIANO_TASKS_CREATED: {len(tasks)} new tasks for user_id={data.user_id}")

    return result

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
    tasks = await db.piano_tasks.find(query).sort("day", 1).to_list(30)
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
