// Minimal storage helper: localStorage-based with simple timestamp versioning
export function saveLocal(key, value){
  const payload = { data: value, updatedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(payload));
}
export function loadLocal(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    const obj = JSON.parse(raw);
    return obj.data;
  } catch(e){
    return fallback;
  }
}
export function getLocalMeta(key){
  try {
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    return JSON.parse(raw);
  } catch(e){ return null; }
}