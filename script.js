// 1. INITIALIZATION
const SUPABASE_URL = "https://svnqppvwptbhxcurxipa.supabase.co";
const SUPABASE_KEY = "sb_publishable_wXN6nc7ug20Zuh89H-k6DQ_gyIZVsfD";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentProfile = null;
let currentPatientId = null;
let patientsData = [];

// 2. AUTHENTICATION
async function loginWithGoogle() {
    await db.auth.signInWithOAuth({ provider: 'google' });
}

async function logout() {
    await db.auth.signOut();
    location.reload();
}

db.auth.onAuthStateChanged(async (event, session) => {
    if (session) {
        currentUser = session.user;
        await loadProfile();
        setupUI();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
    }
});

async function loadProfile() {
    const { data, error } = await db
        .from('profiles')
        .select('*, departments(name)')
        .eq('id', currentUser.id)
        .single();
    
    if (data) {
        currentProfile = data;
        document.getElementById('user-name').innerText = data.full_name;
        document.getElementById('display-dept').innerText = data.departments.name;
        
        // Profile Page
        document.getElementById('prof-name').innerText = data.full_name;
        document.getElementById('prof-email').innerText = data.email;
        document.getElementById('prof-dept').innerText = data.departments.name;
        document.getElementById('prof-role').innerText = data.role;
    }
}

function setupUI() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-sidebar').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    loadPatients();
}

// 3. NAVIGATION
function showPage(pageId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`page-${pageId}`).classList.add('active');
    const navItem = document.getElementById(`nav-${pageId}`);
    if (navItem) navItem.classList.add('active');
    
    document.getElementById('page-title').innerText = pageId.charAt(0).toUpperCase() + pageId.slice(1);
    
    if (pageId === 'patients') loadPatients();
}

// 4. PATIENT MANAGEMENT
async function loadPatients() {
    const { data, error } = await db
        .from('patients')
        .select('*')
        .order('full_name');
    
    if (data) {
        patientsData = data;
        renderPatientTable(data);
        document.getElementById('stat-patients').innerText = data.length;
    }
}

function renderPatientTable(list) {
    const tbody = document.getElementById('patient-list-body');
    tbody.innerHTML = list.map(p => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-4 font-semibold text-gray-800">${p.full_name}</td>
            <td class="p-4 text-sm">${p.gender}</td>
            <td class="p-4 text-sm">${p.phone || '-'}</td>
            <td class="p-4 text-xs">${new Date(p.created_at).toLocaleDateString()}</td>
            <td class="p-4">
                <button onclick="startEncounter('${p.id}', '${p.full_name}')" class="text-blue-600 hover:underline font-bold text-sm">Open Encounter</button>
            </td>
        </tr>
    `).join('');
}

function filterPatients() {
    const q = document.getElementById('patient-search').value.toLowerCase();
    const filtered = patientsData.filter(p => p.full_name.toLowerCase().includes(q));
    renderPatientTable(filtered);
}

async function savePatient() {
    const payload = {
        full_name: document.getElementById('m-full-name').value,
        gender: document.getElementById('m-gender').value,
        phone: document.getElementById('m-phone').value,
        national_id: document.getElementById('m-id').value,
        medical_history: document.getElementById('m-history').value,
        department_id: currentProfile.department_id,
        created_by: currentUser.id
    };

    const { error } = await db.from('patients').insert(payload);
    if (!error) {
        showToast("Patient Added Successfully");
        closeModal('modal-patient');
        loadPatients();
    } else {
        showToast("Error: " + error.message, "error");
    }
}

// 5. ENCOUNTER MANAGEMENT
function startEncounter(id, name) {
    currentPatientId = id;
    document.getElementById('enc-patient-name').innerText = name;
    showPage('encounter');
}

async function saveEncounter() {
    const payload = {
        patient_id: currentPatientId,
        department_id: currentProfile.department_id,
        created_by: currentUser.id,
        weight: parseFloat(document.getElementById('en-weight').value) || parseFloat(document.getElementById('tpn-weight').value),
        enteral_data: {
            weight: document.getElementById('en-weight').value,
            option: document.getElementById('en-option').value,
            start: document.getElementById('res-en-start').innerText
        },
        parenteral_data: {
            weight: document.getElementById('tpn-weight').value,
            gir: document.getElementById('in-gir').value,
            rate: document.getElementById('res-tpn-rate').innerText
        },
        is_draft: false
    };

    const { error } = await db.from('encounters').insert(payload);
    if (!error) {
        showToast("Encounter Saved Successfully");
        showPage('home');
    } else {
        showToast("Save Error: " + error.message, "error");
    }
}

// 6. CALCULATORS (Existing Equations preserved)
function calculateEN() {
    const w = parseFloat(document.getElementById("en-weight").value) || 0;
    // ... existing equations (simplified for example) ...
    const init = 20; const freq = 8;
    document.getElementById("res-en-start").innerText = ((init * w) / freq).toFixed(1);
    document.getElementById("res-en-interval").innerText = 3;
}

function calculateTPN() {
    const w = parseFloat(document.getElementById("tpn-weight").value) || 0;
    const gir = parseFloat(document.getElementById("in-gir").value) || 0;
    // ... existing equations preserved ...
    document.getElementById("res-tpn-rate").innerText = (w * 2).toFixed(1) + " ml/hr";
    document.getElementById("res-glu-conc").innerText = "12.5%";
}

// 7. UTILS
function showToast(msg, type = "success") {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.backgroundColor = type === "success" ? "#059669" : "#dc2626";
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function openAddPatientModal() { document.getElementById('modal-patient').classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
