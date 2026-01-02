/* script.js
   Core interactive logic for Student Health & Wellness Tracker
   - Stores data in localStorage
   - Validates forms
   - Updates Chart.js charts in each section
   - Generates friendly tips (NOT medical advice)
   - Generates QR code for sharing
*/

/* ====================
   Utility helpers
   ==================== */

// LocalStorage keys
const LS_KEYS = {
  FOCUS: 'shwt_focus_entries',
  SKIN: 'shwt_skin_entries',
  MOOD: 'shwt_mood_entries'
};

// Safe parse helper
function lp(key){
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : [];
  } catch(e){ return []; }
}
function lsSet(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

// Format today's date as YYYY-MM-DD
function todayDate(){
  return new Date().toISOString().slice(0,10);
}

/* ====================
   Basic page setup
   ==================== */
document.addEventListener('DOMContentLoaded', () => {
  // Set current year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Initialize share link
  const shareInput = document.getElementById('share-link');
  shareInput.value = window.location.href;

  // Initialize date input default
  const moodDate = document.getElementById('mood-date');
  if (moodDate) moodDate.value = todayDate();

  // Initialize charts and load existing data
  setupCharts();
  loadAll();

  // Button handlers
  document.getElementById('focus-form').addEventListener('submit', onFocusSubmit);
  document.getElementById('focus-clear').addEventListener('click', clearFocusData);

  document.getElementById('skin-form').addEventListener('submit', onSkinSubmit);
  document.getElementById('skin-clear').addEventListener('click', clearSkinData);

  document.getElementById('mood-form').addEventListener('submit', onMoodSubmit);
  document.getElementById('mood-clear').addEventListener('click', clearMoodData);

  document.getElementById('generate-qr').addEventListener('click', generateQR);
  document.getElementById('download-qr').addEventListener('click', downloadQR);

  document.getElementById('export-data').addEventListener('click', exportData);
});

/* ====================
   Form validation helpers
   ==================== */

function showError(id, msg){
  const el = document.getElementById(id);
  if(el) el.textContent = msg || '';
}

/* ====================
   Data models and event handlers
   ==================== */

/* Focus section:
   store objects: {date, sleep, screen, exercise, rating}
*/
function onFocusSubmit(e){
  e.preventDefault();
  // Read inputs
  const sleep = parseFloat(document.getElementById('focus-sleep').value);
  const screen = parseFloat(document.getElementById('focus-screen').value);
  const exercise = parseFloat(document.getElementById('focus-exercise').value);
  const rating = parseInt(document.getElementById('focus-rating').value,10);

  // Validate
  let ok=true;
  if(isNaN(sleep) || sleep < 0 || sleep > 24){ showError('focus-sleep-error','Enter 0–24'); ok=false } else showError('focus-sleep-error','');
  if(isNaN(screen) || screen < 0 || screen > 24){ showError('focus-screen-error','Enter 0–24'); ok=false } else showError('focus-screen-error','');
  if(isNaN(exercise) || exercise < 0 || exercise > 600){ showError('focus-exercise-error','Enter 0–600'); ok=false } else showError('focus-exercise-error','');
  if(isNaN(rating) || rating < 1 || rating > 10){ showError('focus-rating-error','Enter 1–10'); ok=false } else showError('focus-rating-error','');

  if(!ok) return;

  const entries = lp(LS_KEYS.FOCUS);
  entries.push({
    date: todayDate(),
    sleep, screen, exercise, rating
  });
  lsSet(LS_KEYS.FOCUS, entries);

  // Clear inputs for convenience
  document.getElementById('focus-form').reset();

  // Update visuals
  updateFocusCharts(entries);
  updateFocusTips(entries);
}

/* Skin section:
   store objects: {date, sleep, water, stress, condition}
   Map condition to numeric score for plotting: clear=3, dry=2, irritated=1
*/
function onSkinSubmit(e){
  e.preventDefault();
  const sleep = parseFloat(document.getElementById('skin-sleep').value);
  const water = parseFloat(document.getElementById('skin-water').value);
  const stress = parseInt(document.getElementById('skin-stress').value,10);
  const condition = document.getElementById('skin-condition').value;

  let ok=true;
  if(isNaN(sleep) || sleep < 0 || sleep > 24){ showError('skin-sleep-error','Enter 0–24'); ok=false } else showError('skin-sleep-error','');
  if(isNaN(water) || water < 0 || water > 50){ showError('skin-water-error','Enter 0–50'); ok=false } else showError('skin-water-error','');
  if(isNaN(stress) || stress < 1 || stress > 10){ showError('skin-stress-error','Enter 1–10'); ok=false } else showError('skin-stress-error','');
  if(!condition){ showError('skin-condition-error','Select a condition'); ok=false } else showError('skin-condition-error','');

  if(!ok) return;

  const entries = lp(LS_KEYS.SKIN);
  entries.push({
    date: todayDate(),
    sleep, water, stress, condition
  });
  lsSet(LS_KEYS.SKIN, entries);

  document.getElementById('skin-form').reset();

  updateSkinCharts(entries);
  updateSkinTips(entries);
}

/* Mood section:
   store objects: {date, mood, triggers:[]}
*/
function onMoodSubmit(e){
  e.preventDefault();
  const date = document.getElementById('mood-date').value;
  const mood = document.getElementById('mood-value').value;
  const triggers = Array.from(document.querySelectorAll('input[name="triggers"]:checked')).map(n => n.value);

  let ok=true;
  if(!date){ showError('mood-date-error','Select a date'); ok=false } else showError('mood-date-error','');
  if(!mood){ showError('mood-value-error','Select a mood'); ok=false } else showError('mood-value-error','');

  if(!ok) return;

  const entries = lp(LS_KEYS.MOOD);
  entries.push({ date, mood, triggers });
  lsSet(LS_KEYS.MOOD, entries);

  document.getElementById('mood-form').reset();
  document.getElementById('mood-date').value = todayDate();

  updateMoodCharts(entries);
  updateMoodTips(entries);
}

/* Clear functions for convenience (confirm) */
function clearFocusData(){
  if(confirm('Clear all Focus data? This cannot be undone.')) {
    localStorage.removeItem(LS_KEYS.FOCUS);
    updateFocusCharts([]);
    updateFocusTips([]);
  }
}
function clearSkinData(){
  if(confirm('Clear all Skin data? This cannot be undone.')) {
    localStorage.removeItem(LS_KEYS.SKIN);
    updateSkinCharts([]);
    updateSkinTips([]);
  }
}
function clearMoodData(){
  if(confirm('Clear all Mood data? This cannot be undone.')) {
    localStorage.removeItem(LS_KEYS.MOOD);
    updateMoodCharts([]);
    updateMoodTips([]);
  }
}

/* Export data as JSON file */
function exportData(){
  const data = {
    focus: lp(LS_KEYS.FOCUS),
    skin: lp(LS_KEYS.SKIN),
    mood: lp(LS_KEYS.MOOD)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'student-health-data.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ====================
   Chart.js setup and updating
   ==================== */

/* Keep chart instances in an object for updates */
const charts = {};

function setupCharts(){
  // Focus charts (scatter)
  const ctx1 = document.getElementById('chart-sleep-focus').getContext('2d');
  charts.sleepFocus = new Chart(ctx1, {
    type: 'scatter',
    data: { datasets: [{ label:'Sleep vs Focus', data:[], backgroundColor: 'rgba(108,92,231,0.9)' }] },
    options: {
      responsive:true,
      scales:{
        x:{title:{display:true,text:'Sleep (hours)'} , min:0, max:24},
        y:{title:{display:true,text:'Focus (1-10)'}, min:0, max:10}
      },
      plugins:{legend:{display:false}}
    }
  });

  const ctx2 = document.getElementById('chart-screen-focus').getContext('2d');
  charts.screenFocus = new Chart(ctx2, {
    type: 'scatter',
    data: { datasets: [{ label:'Screen vs Focus', data:[], backgroundColor: 'rgba(0,163,255,0.9)' }] },
    options: {
      responsive:true,
      scales:{
        x:{title:{display:true,text:'Screen time (hours)'} , min:0, max:24},
        y:{title:{display:true,text:'Focus (1-10)'}, min:0, max:10}
      },
      plugins:{legend:{display:false}}
    }
  });

  // Skin charts
  const ctx3 = document.getElementById('chart-water-skin').getContext('2d');
  charts.waterSkin = new Chart(ctx3, {
    type: 'scatter',
    data: { datasets:[{ label:'Water vs Skin Score', data:[], backgroundColor:'rgba(108,92,231,0.9)' }] },
    options: {
      responsive:true,
      scales:{
        x:{title:{display:true,text:'Water (cups)'} , min:0, max:50},
        y:{title:{display:true,text:'Skin score (1=irritated,3=clear)'}, min:0, max:3.5}
      },
      plugins:{legend:{display:false}}
    }
  });

  const ctx4 = document.getElementById('chart-stress-skin').getContext('2d');
  charts.stressSkin = new Chart(ctx4, {
    type: 'scatter',
    data: { datasets:[{ label:'Stress vs Skin Score', data:[], backgroundColor:'rgba(0,163,255,0.9)' }] },
    options: {
      responsive:true,
      scales:{
        x:{title:{display:true,text:'Stress (1-10)'} , min:1, max:10},
        y:{title:{display:true,text:'Skin score'}, min:0, max:3.5}
      },
      plugins:{legend:{display:false}}
    }
  });

  // Mood trends (weekly counts)
  const ctx5 = document.getElementById('chart-mood-trend').getContext('2d');
  charts.moodTrend = new Chart(ctx5, {
    type: 'line',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [
        { label:'Happy', data:[], borderColor:'rgba(108,92,231,0.9)', backgroundColor:'rgba(108,92,231,0.12)', tension:0.3 },
        { label:'Calm', data:[], borderColor:'rgba(0,163,255,0.9)', backgroundColor:'rgba(0,163,255,0.12)', tension:0.3 },
        { label:'Stressed', data:[], borderColor:'rgba(255,99,132,0.9)', backgroundColor:'rgba(255,99,132,0.08)', tension:0.3 },
        { label:'Tired', data:[], borderColor:'rgba(99,102,241,0.8)', backgroundColor:'rgba(99,102,241,0.08)', tension:0.3 }
      ]
    },
    options: { responsive:true, plugins: {legend:{position:'top'}} }
  });

  // Summary charts
  const ctx6 = document.getElementById('chart-summary-sleep').getContext('2d');
  charts.summarySleep = new Chart(ctx6, {
    type:'bar',
    data: { labels: [], datasets: [{ label:'Average Focus', data:[], backgroundColor: 'rgba(108,92,231,0.9)' }] },
    options:{ responsive:true, scales:{ y:{beginAtZero:true, max:10} } }
  });

  const ctx7 = document.getElementById('chart-summary-skin').getContext('2d');
  charts.summarySkin = new Chart(ctx7, {
    type:'doughnut',
    data:{ labels:['Clear','Dry','Irritated'], datasets:[{ data:[0,0,0], backgroundColor:['rgba(108,92,231,0.9)','rgba(0,163,255,0.9)','rgba(255,99,132,0.9)'] }] },
    options:{ responsive:true }
  });
}

/* ====================
   Update functions for charts and tips
   ==================== */

function loadAll(){
  const focusEntries = lp(LS_KEYS.FOCUS);
  const skinEntries = lp(LS_KEYS.SKIN);
  const moodEntries = lp(LS_KEYS.MOOD);

  updateFocusCharts(focusEntries);
  updateSkinCharts(skinEntries);
  updateMoodCharts(moodEntries);

  updateFocusTips(focusEntries);
  updateSkinTips(skinEntries);
  updateMoodTips(moodEntries);

  updateSummary();
}

/* Focus charts updates */
function updateFocusCharts(entries){
  // Prepare data arrays for scatter charts
  const sleepPoints = entries.map(e => ({x: e.sleep, y: e.rating}));
  const screenPoints = entries.map(e => ({x: e.screen, y: e.rating}));

  charts.sleepFocus.data.datasets[0].data = sleepPoints;
  charts.sleepFocus.update();

  charts.screenFocus.data.datasets[0].data = screenPoints;
  charts.screenFocus.update();

  // update summary
  updateSummary();
}

/* Skin charts updates
   Map skin condition to score: clear=3, dry=2, irritated=1
*/
function conditionScore(cond){
  if(cond==='clear') return 3;
  if(cond==='dry') return 2;
  if(cond==='irritated') return 1;
  return 0;
}
function updateSkinCharts(entries){
  const waterPoints = entries.map(e => ({x: e.water, y: conditionScore(e.condition)}));
  const stressPoints = entries.map(e => ({x: e.stress, y: conditionScore(e.condition)}));

  charts.waterSkin.data.datasets[0].data = waterPoints;
  charts.waterSkin.update();

  charts.stressSkin.data.datasets[0].data = stressPoints;
  charts.stressSkin.update();

  // update summary
  updateSummary();
}

/* Mood charts updates: create counts per weekday for each mood */
function updateMoodCharts(entries){
  // Initialize counts
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const moodMap = { happy:0, calm:1, stressed:2, tired:3 };
  const counts = { happy:new Array(7).fill(0), calm:new Array(7).fill(0), stressed:new Array(7).fill(0), tired:new Array(7).fill(0) };

  entries.forEach(e=>{
    const d = new Date(e.date);
    const weekday = (d.getDay()+6)%7; // convert JS 0(Sun)-6 to Mon=0..Sun=6
    if(e.mood && counts[e.mood]) counts[e.mood][weekday] += 1;
  });

  charts.moodTrend.data.labels = labels;
  charts.moodTrend.data.datasets[0].data = counts.happy;
  charts.moodTrend.data.datasets[1].data = counts.calm;
  charts.moodTrend.data.datasets[2].data = counts.stressed;
  charts.moodTrend.data.datasets[3].data = counts.tired;
  charts.moodTrend.update();

  // update summary
  updateSummary();
}

/* Summary chart: compute average focus by sleep range and skin distribution */
function updateSummary(){
  const focusEntries = lp(LS_KEYS.FOCUS);
  const skinEntries = lp(LS_KEYS.SKIN);

  // Average focus by sleep buckets (<=6, 6-7, 7-9, 9+)
  const buckets = [
    {label:'<=6', min:-1, max:6, sum:0, n:0},
    {label:'6-7', min:6, max:7, sum:0, n:0},
    {label:'7-9', min:7, max:9, sum:0, n:0},
    {label:'9+', min:9, max:100, sum:0, n:0}
  ];
  focusEntries.forEach(e=>{
    buckets.forEach(b=>{
      if(e.sleep > b.min && e.sleep <= b.max){ b.sum += e.rating; b.n += 1; }
    });
  });
  charts.summarySleep.data.labels = buckets.map(b => b.label);
  charts.summarySleep.data.datasets[0].data = buckets.map(b => b.n ? +(b.sum / b.n).toFixed(2) : 0);
  charts.summarySleep.update();

  // Skin distribution
  const counts = { clear:0, dry:0, irritated:0 };
  skinEntries.forEach(e => {
    if(e.condition && counts[e.condition] !== undefined) counts[e.condition] += 1;
  });
  charts.summarySkin.data.datasets[0].data = [counts.clear, counts.dry, counts.irritated];
  charts.summarySkin.update();

  // Summary insights paragraph
  const insightEl = document.getElementById('summary-insights');
  const insights = [];

  // Sleep -> focus
  const avg7to9 = buckets[2].n ? buckets[2].sum / buckets[2].n : 0;
  const avgOthers = buckets.reduce((acc,b,i)=> i!==2 ? acc + (b.n ? b.sum / b.n : 0) : acc,0);
  if(buckets[2].n && buckets.reduce((acc,b)=>acc+b.n,0) >= 3){
    insights.push(`Students sleeping 7–9 hours show an average focus of ${avg7to9.toFixed(1)} out of 10 — often higher than other sleep ranges.`);
  } else if(focusEntries.length>0){
    insights.push('Add a few more focus entries to see stronger sleep→focus patterns.');
  } else {
    insights.push('No focus data yet — add entries in Focus & Energy to see personalized insights.');
  }

  // Skin insight
  const totalSkin = skinEntries.length;
  if(totalSkin > 0){
    const best = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const mapNice = { clear: 'clear', dry: 'dry', irritated: 'irritated' };
    insights.push(`Most recent skin entries show "${mapNice[best[0]]}" as common. Increasing water and managing stress often helps skin health.`);
  } else {
    insights.push('No skin data yet — add entries in Skin Health to track patterns.');
  }

  // Mood insight
  const moodEntries = lp(LS_KEYS.MOOD);
  if(moodEntries.length > 0){
    const moodCounts = moodEntries.reduce((acc, e) => { acc[e.mood] = (acc[e.mood]||0)+1; return acc }, {});
    const topMood = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1])[0];
    if(topMood) insights.push(`Your most recorded mood is "${topMood[0]}". Try small habit changes (sleep, water, exercise) to see if mood improves.`)
  } else {
    insights.push('No mood data yet — track daily mood to see weekly trends and triggers.');
  }

  insightEl.textContent = insights.join(' ');
}

/* ====================
   Tips generation
   ==================== */

function updateFocusTips(entries){
  const el = document.getElementById('focus-tips');
  if(!entries || entries.length === 0){
    el.innerHTML = `<strong>Tips:</strong> Add focus entries to receive personalized tips. General tip: aim for 7–9 hours of sleep for better focus.`;
    return;
  }

  // compute averages
  const avgSleep = (entries.reduce((s,e)=>s+e.sleep,0))/entries.length;
  const avgScreen = (entries.reduce((s,e)=>s+e.screen,0))/entries.length;
  const avgExercise = (entries.reduce((s,e)=>s+e.exercise,0))/entries.length;
  const avgRating = (entries.reduce((s,e)=>s+e.rating,0))/entries.length;

  const suggestions = [];
  if(avgSleep >= 7 && avgSleep <= 9) suggestions.push('Nice! Students who sleep 7–9 hours often report better focus.');
  else if(avgSleep < 7) suggestions.push('Try to increase sleep closer to 7–9 hours — more rest is linked with higher focus.');
  else suggestions.push('Sleeping too long may impact routine — aim for consistent 7–9 hours.');

  if(avgScreen > 4) suggestions.push('High screen time may reduce attention — consider breaks and screen-free study time.');
  if(avgExercise < 20) suggestions.push('Short daily exercise (20–30 minutes) is linked with improved energy and focus.');
  if(avgRating < 6) suggestions.push('Low energy? Try evaluating sleep, movement, and screen breaks.');

  el.innerHTML = `<strong>Tips:</strong><ul>${suggestions.map(s=>`<li>${s}</li>`).join('')}</ul>`;
}

function updateSkinTips(entries){
  const el = document.getElementById('skin-tips');
  if(!entries || entries.length === 0){
    el.innerHTML = `<strong>Tips:</strong> Track skin and habits here. General friendly tips: drink water, protect skin from harsh scrubs, and get rest.`;
    return;
  }

  const avgWater = (entries.reduce((s,e)=>s+e.water,0))/entries.length;
  const avgStress = (entries.reduce((s,e)=>s+e.stress,0))/entries.length;
  const countClear = entries.filter(e=>e.condition==='clear').length;
  const countIrritated = entries.filter(e=>e.condition==='irritated').length;

  const suggestions = [];
  if(avgWater >= 6) suggestions.push('Great — good water intake supports skin hydration.');
  else suggestions.push('Try increasing water intake a bit — hydration can help skin appearance.');

  if(avgStress > 6) suggestions.push('Higher stress levels often link with skin flare-ups. Try small stress breaks or breathing exercises.');
  if(countIrritated > countClear) suggestions.push('You have more irritated skin entries — be gentle with skincare and avoid harsh ingredients.');

  el.innerHTML = `<strong>Friendly Skin Tips:</strong><ul>${suggestions.map(s=>`<li>${s}</li>`).join('')}</ul><p style="font-size:12px;color:#6b7280;margin-top:6px">This is friendly guidance, not medical advice.</p>`;
}

function updateMoodTips(entries){
  const el = document.getElementById('mood-tips');
  if(!entries || entries.length === 0){
    el.innerHTML = `<strong>Tips:</strong> Keep a daily mood log to spot patterns. Small routines like short walks, consistent sleep, and talking to friends can help mood.`;
    return;
  }

  // If many 'stressed' entries, provide coping tips
  const moodCounts = entries.reduce((acc,e)=>{ acc[e.mood]=(acc[e.mood]||0)+1; return acc },{});
  const suggestions = [];
  if((moodCounts.stressed || 0) > (moodCounts.happy || 0)){
    suggestions.push('You have recorded stress often. Try short breathing breaks, a quick walk, or organizing tasks into smaller steps.');
  }
  if((moodCounts.tired || 0) > 0){
    suggestions.push('Feeling tired regularly? Look at sleep and screen habits — small changes can help energy.');
  }
  if((moodCounts.happy || 0) >= Math.max(moodCounts.calm || 0, moodCounts.stressed || 0, moodCounts.tired || 0)){
    suggestions.push('Nice — you record happy moods often. Keep doing the healthy routines that support this mood.');
  }

  el.innerHTML = `<strong>Mood Tips:</strong><ul>${suggestions.map(s=>`<li>${s}</li>`).join('')}</ul>`;
}

/* ====================
   QR code generation
   ==================== */

let qr; // store QR object

function generateQR(){
  const target = document.getElementById('qrcode');
  target.innerHTML = ''; // clear
  const url = document.getElementById('share-link').value || window.location.href;
  qr = new QRCode(target, {
    text: url,
    width: 200,
    height: 200,
    colorDark : "#2b2b2b",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });
  // Smooth scroll to QR section
  target.scrollIntoView({behavior:'smooth', block:'center'});
}

function downloadQR(){
  if(!qr){
    alert('Generate the QR code first.');
    return;
  }
  // The QRCode library creates an img or canvas inside the container.
  const container = document.getElementById('qrcode');
  const img = container.querySelector('img') || container.querySelector('canvas');
  if(!img){ alert('QR code not found. Regenerate it.'); return; }

  // If it's an <img>, fetch its src; if canvas, use toDataURL
  if(img.tagName.toLowerCase() === 'img'){
    const a = document.createElement('a');
    a.href = img.src;
    a.download = 'student-tracker-qr.png';
    a.click();
  } else {
    const dataUrl = img.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'student-tracker-qr.png';
    a.click();
  }
}

/* ====================
   Initialization helpers
   ==================== */

// Load and reflect current stored data into charts & tips on page load
// Already called in DOMContentLoaded via loadAll()

/* End of script.js */