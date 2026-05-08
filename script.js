const SUPABASE_URL = "pjcposbbgaqbljrsamax";
const SUPABASE_KEY = "sb_publishable_xxZtrsyB46at2eaowuuKhQ_q_1GLHxF";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentPatient = null;
let currentEncounterId = null;

// --- AUTH ---
async function login() {
    await db.auth.signInWithOAuth({ provider: 'google' });
}

async function logout() {
    await db.auth.signOut();
    window.location.reload();
}

db.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        document.getElementById('login-screen').classList.add('hidden');
        loadProfile();
        showPage('home');
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
    }
});

async function loadProfile() {
    const { data } = await db.from('profiles').select('*, departments(name)').eq('id', currentUser.id).single();
    if (data) {
        document.getElementById('user-info').innerText = data.full_name;
        document.getElementById('user-dept').innerText = data.departments.name;
    }
}

// --- NAVIGATION ---
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active-nav'));
    const navItem = document.getElementById(`nav-${pageId}`);
    if(navItem) navItem.classList.add('active-nav');
    
    if(pageId === 'patients') loadPatients();
}

// --- PATIENT MANAGEMENT ---
async function loadPatients() {
    const { data, error } = await db.from('patients').select('*').order('full_name');
    const tbody = document.getElementById('patient-list-body');
    tbody.innerHTML = data.map(p => `
        <tr class="border-t hover:bg-gray-50">
            <td class="p-4 font-bold">${p.full_name}</td>
            <td class="p-4">${p.gender}</td>
            <td class="p-4">${p.phone}</td>
            <td class="p-4">
                <button onclick="openPatient('${p.id}')" class="text-blue-600 hover:underline">View</button>
            </td>
        </tr>
    `).join('');
}

// --- ENCOUNTER MANAGEMENT ---
async function saveEncounter() {
    const enteralData = {
        weight: document.getElementById('en-weight').value,
        option: document.getElementById('en-option').value,
        // ... capture all other calculation inputs
    };
    
    const parenteralData = {
        weight: document.getElementById('tpn-weight').value,
        // ... capture all other calculation inputs
    };

    const { error } = await db.from('encounters').upsert({
        id: currentEncounterId, // if null, Supabase creates new
        patient_id: currentPatient.id,
        department_id: currentUser.user_metadata.dept_id, // ensure this is in session or profile
        weight_kg: document.getElementById('en-weight').value || document.getElementById('tpn-weight').value,
        enteral_data: enteralData,
        parenteral_data: parenteralData,
        is_draft: false,
        created_by: currentUser.id
    });

    if(!error) alert("Encounter Saved Successfully!");
}

// NOTE: Use your existing calculateEN() and calculateTPN() logic.
// Just ensure they read/write to the DOM as they do now.

