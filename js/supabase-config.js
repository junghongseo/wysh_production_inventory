// Custom Reusable Confirmation Modal Helper
window.showConfirmModal = function(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    
    if (!modal || !titleEl || !messageEl || !okBtn || !cancelBtn) {
        // Fallback to native confirm if elements are missing
        if (confirm(message)) {
            onConfirm();
        }
        return;
    }
    
    titleEl.innerText = title;
    messageEl.innerText = message;
    
    // Open modal
    modal.classList.add('open');
    
    // Bind buttons
    okBtn.onclick = () => {
        modal.classList.remove('open');
        onConfirm();
    };
    
    cancelBtn.onclick = () => {
        modal.classList.remove('open');
    };
};

let SUPABASE_URL = "https://sdhcrckyfjbakbriqdrn.supabase.co";
let SUPABASE_ANON_KEY = "sb_publishable_W1Gt3An6e2EGcuQMFOkzuA_1YL9OXnX";

// Attempt to load and parse .env.local dynamically at runtime
try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", ".env.local", false); // Synchronous fetch to block until variables are read
    xhr.send();
    if (xhr.status === 200) {
        const text = xhr.responseText;
        const lines = text.split(/\r?\n/);
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const parts = trimmed.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                    if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
                        SUPABASE_URL = val;
                    } else if (key === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
                        SUPABASE_ANON_KEY = val;
                    }
                }
            }
        });
        console.log("Supabase Configuration loaded dynamically from .env.local");
    }
} catch (e) {
    console.log("Could not load .env.local dynamically, using fallback config.");
}

// Initialize Supabase Client
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("Supabase Connection: Active (Synced with Cloud DB)");
        } else {
            console.error("Supabase SDK library not loaded.");
        }
    } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
    }
} else {
    console.log("Supabase Connection: Inactive (Running in LocalStorage-only fallback mode)");
}

window.supabaseClient = supabaseClient;
