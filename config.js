// =====================================================================
// Ripetiamo · impostazioni del sito
// Questa chiave è pubblica per natura: i dati sono protetti dalle regole
// di sicurezza del database (Row Level Security), non da questa chiave.
// =====================================================================
window.RIPETIAMO_CONFIG = {
  SUPABASE_URL: "https://ivlawwdesbefjlnsppeb.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGF3d2Rlc2JlZmpsbnNwcGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5NjE5NjIsImV4cCI6MjEwOTUzNzk2Mn0.a8XJ2x4gv-yQB_bIpSNAbK13No9zG8K-j1TBEuG7Aws",

  // Indirizzo del calendario dei tutor (funzione già pubblicata su Supabase)
  CALENDAR_URL: "https://ivlawwdesbefjlnsppeb.supabase.co/functions/v1/calendar",

  // Email che compare nel sito per contatti, segnalazioni e sponsor
  CONTACT_EMAIL: "info@ripetiamo.eu",

  // Google AdSense: lascia vuoto finché Google non approva il sito.
  // Poi incolla qui il tuo codice editore (ca-pub-...) e l'ID dello spazio annunci.
  ADSENSE_CLIENT: "ca-pub-4222196640359739",
  ADSENSE_SLOT: "",
  // Metti true SOLO dopo aver attivato in AdSense → «Privacy e messaggi» il banner di consenso per l'Europa (CMP certificata).
  // Finché è false lo script di Google non si carica (obbligatorio nello Spazio economico europeo, e qui ci sono minorenni).
  ADSENSE_CMP_READY: false
};
