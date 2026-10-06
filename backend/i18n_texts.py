"""Testi del server nelle cinque lingue dell'app (it, en, fr, es, de).

Qui stanno solo le parti che il server produce da solo e mostra alle persone: le risposte
dell'AI Coach, il messaggio di sicurezza, i suggerimenti di riserva. I messaggi di errore
(es. "Credenziali non valide") restano in italiano nel server e li traduce l'app.

ATTENZIONE: il messaggio di sicurezza e i numeri di aiuto vanno fatti rivedere da una persona
madrelingua prima della pubblicazione.
"""

SUPPORTED = ("it", "en", "fr", "es", "de")
DEFAULT_LANG = "it"

LANGUAGE_NAMES = {
    "it": "italiano",
    "en": "English",
    "fr": "français",
    "es": "español",
    "de": "Deutsch",
}


def norm_lang(code):
    """'fr-CA', 'DE', None -> uno dei codici supportati (italiano se sconosciuto)."""
    if not code:
        return DEFAULT_LANG
    base = str(code).lower().replace("_", "-").split("-")[0]
    return base if base in SUPPORTED else DEFAULT_LANG


# Parole che fanno scattare il messaggio di sicurezza (si controllano tutte le lingue:
# chi scrive puo' usare una lingua diversa da quella dell'app)
SAFETY_KEYWORDS = [
    # italiano
    "suicid", "uccid", "morte", "morire", "autolesion", "depress grave", "panico", "ansia grave",
    # english
    "kill myself", "end my life", "want to die", "self-harm", "self harm", "severe depression", "panic attack",
    # français
    "me tuer", "mourir", "automutil", "dépression sévère", "depression severe", "crise de panique",
    # español
    "matarme", "quitarme la vida", "quiero morir", "autolesi", "depresión grave", "depresion grave", "ataque de pánico", "ataque de panico",
    # deutsch
    "selbstmord", "suizid", "umbringen", "sterben", "selbstverletz", "schwere depression", "panikattacke",
]

SAFETY_RESPONSE = {
    "it": (
        "Mi dispiace che tu stia attraversando un momento difficile. "
        "È molto importante che tu parli con un professionista della salute mentale che possa offrirti il supporto adeguato. "
        "Ti consiglio di contattare il tuo medico o un servizio di supporto psicologico. "
        "In caso di emergenza, puoi chiamare il 112 o rivolgerti al pronto soccorso più vicino. "
        "La tua salute e il tuo benessere sono la priorità. 💚"
    ),
    "en": (
        "I'm sorry you're going through a difficult time. "
        "It's very important that you talk to a mental health professional who can give you the right support. "
        "I recommend contacting your doctor or a psychological support service. "
        "If you are in immediate danger, call your local emergency number (for example 112 in Europe, 999 in the UK or 911 in the US) "
        "or go to the nearest emergency room. You can also find helplines in your country at befrienders.org. "
        "Your health and wellbeing come first. 💚"
    ),
    "fr": (
        "Je suis désolé que tu traverses un moment difficile. "
        "Il est très important que tu parles à un professionnel de la santé mentale qui pourra t'apporter le soutien adapté. "
        "Je te conseille de contacter ton médecin ou un service d'écoute psychologique. "
        "En France, tu peux appeler le 3114, le numéro national de prévention du suicide, joignable 24 h sur 24. "
        "En cas d'urgence, appelle le 112 ou rends-toi aux urgences les plus proches. "
        "Ta santé et ton bien-être passent avant tout. 💚"
    ),
    "es": (
        "Siento que estés pasando por un momento difícil. "
        "Es muy importante que hables con un profesional de la salud mental que pueda ofrecerte el apoyo adecuado. "
        "Te recomiendo contactar con tu médico o con un servicio de apoyo psicológico. "
        "En España puedes llamar al 024, la línea de atención a la conducta suicida, disponible las 24 horas. "
        "En caso de emergencia, llama al 112 o acude a urgencias. "
        "Tu salud y tu bienestar son lo primero. 💚"
    ),
    "de": (
        "Es tut mir leid, dass du gerade eine schwere Zeit durchmachst. "
        "Es ist sehr wichtig, dass du mit einer Fachperson für psychische Gesundheit sprichst, die dir die passende Unterstützung geben kann. "
        "Ich empfehle dir, dich an deine Hausärztin, deinen Hausarzt oder eine psychologische Beratungsstelle zu wenden. "
        "Rund um die Uhr und kostenlos erreichst du die Telefonseelsorge unter 0800 111 0 111. "
        "Im Notfall rufe die 112 an oder wende dich an die nächste Notaufnahme. "
        "Deine Gesundheit und dein Wohlbefinden stehen an erster Stelle. 💚"
    ),
}

# Risposte di riserva quando l'AI non e' raggiungibile
CHAT_FALLBACKS = {
    "it": [
        "Grazie per la tua domanda! Per migliorare il tuo benessere, ricorda di: fare movimento regolare, dormire bene, bere molta acqua e praticare la mindfulness. 🌿",
        "Il benessere è un viaggio! Inizia con piccoli passi: una camminata di 10 minuti, qualche respiro profondo, o semplicemente prenderti un momento per te. 💚",
        "Ricorda i pilastri del benessere: alimentazione sana, movimento, riposo adeguato, gestione dello stress e connessioni sociali positive. Su quale vuoi lavorare oggi? 🌱",
    ],
    "en": [
        "Thanks for your question! To improve your wellbeing, remember to move regularly, sleep well, drink plenty of water and practise mindfulness. 🌿",
        "Wellbeing is a journey! Start with small steps: a 10-minute walk, a few deep breaths, or simply taking a moment for yourself. 💚",
        "Remember the pillars of wellbeing: healthy eating, movement, enough rest, managing stress and positive social connections. Which one would you like to work on today? 🌱",
    ],
    "fr": [
        "Merci pour ta question ! Pour améliorer ton bien-être, pense à bouger régulièrement, bien dormir, boire beaucoup d'eau et pratiquer la pleine conscience. 🌿",
        "Le bien-être est un voyage ! Commence par de petits pas : une marche de 10 minutes, quelques respirations profondes, ou simplement un moment pour toi. 💚",
        "Rappelle-toi les piliers du bien-être : une alimentation saine, le mouvement, un repos suffisant, la gestion du stress et des liens sociaux positifs. Sur lequel veux-tu travailler aujourd'hui ? 🌱",
    ],
    "es": [
        "¡Gracias por tu pregunta! Para mejorar tu bienestar, recuerda moverte con regularidad, dormir bien, beber mucha agua y practicar la atención plena. 🌿",
        "¡El bienestar es un viaje! Empieza con pequeños pasos: un paseo de 10 minutos, unas respiraciones profundas o simplemente un momento para ti. 💚",
        "Recuerda los pilares del bienestar: alimentación sana, movimiento, descanso adecuado, gestión del estrés y vínculos sociales positivos. ¿En cuál quieres trabajar hoy? 🌱",
    ],
    "de": [
        "Danke für deine Frage! Für mehr Wohlbefinden: Bewege dich regelmäßig, schlafe gut, trink viel Wasser und übe Achtsamkeit. 🌿",
        "Wohlbefinden ist eine Reise! Beginne mit kleinen Schritten: ein 10-minütiger Spaziergang, ein paar tiefe Atemzüge oder einfach ein Moment für dich. 💚",
        "Denk an die Säulen des Wohlbefindens: gesunde Ernährung, Bewegung, ausreichend Ruhe, Stressbewältigung und positive soziale Kontakte. An welcher möchtest du heute arbeiten? 🌱",
    ],
}

# Suggerimento di riserva per "chiedi qualcosa di diverso"
RESOURCE_FALLBACK = {
    "it": "Non riesco a darti un suggerimento su misura in questo momento. Prova a fare 2 minuti di respirazione lenta mentre ci ripensi: a volte basta quello per ripartire.",
    "en": "I can't give you a tailored suggestion right now. Try 2 minutes of slow breathing while you think it over: sometimes that's enough to get going again.",
    "fr": "Je ne peux pas te donner de suggestion sur mesure pour le moment. Essaie 2 minutes de respiration lente en y repensant : parfois, cela suffit pour repartir.",
    "es": "No puedo darte una sugerencia a tu medida en este momento. Prueba 2 minutos de respiración lenta mientras lo piensas: a veces basta para volver a arrancar.",
    "de": "Ich kann dir gerade keinen persönlichen Vorschlag machen. Probiere 2 Minuten langsames Atmen, während du darüber nachdenkst: Manchmal genügt das, um wieder in Gang zu kommen.",
}

# Istruzione di lingua da aggiungere ai prompt dell'AI
def reply_language_rule(lang):
    lang = norm_lang(lang)
    if lang == "it":
        return "Rispondi sempre in italiano."
    return f"Always reply in {LANGUAGE_NAMES[lang]}, using the informal 'you' form (tu/tú/du). Never switch to another language."
