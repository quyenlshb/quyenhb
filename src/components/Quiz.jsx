import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';

export default function Quiz({ sets, settings, onFinish, onUpdatePoints }){
  const [activeSetId, setActiveSetId] = useState(null);
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [showNote, setShowNote] = useState(false);
  const [selected, setSelected] = useState(null);

  // Thêm state mới để lưu các lựa chọn
  const [options, setOptions] = useState([]);

  useEffect(() => {
    setTimer(settings.timer);
  }, [settings]);

  useEffect(() => {
    let t;
    if(pool.length && timer>0 && !showNote){
      t = setTimeout(()=> setTimer(timer-1), 1000);
    }
    if(timer===0 && pool.length && !showNote){
      // treat as wrong
      setShowNote(true);
    }
    return ()=> clearTimeout(t);
  }, [timer, pool, showNote]);

  // useEffect này sẽ chạy mỗi khi `index` hoặc `pool` thay đổi
  useEffect(() => {
    if(pool.length > 0) {
      const current = pool[index];
      const newOptions = [];
      newOptions.push(current.meaning);

      // Lấy các đáp án sai ngẫu nhiên
      while(newOptions.length < 4){
        const other = pool[Math.floor(Math.random() * pool.length)];
        if(other && !newOptions.includes(other.meaning)) {
          newOptions.push(other.meaning);
        }
        if(pool.length < 4) break;
      }

      // Xáo trộn mảng đáp án
      for(let i = newOptions.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
      }
      setOptions(newOptions);
    }
  }, [index, pool]);

  const start = (setId) => {
    const s = sets.find(x=>x.id===setId);
    if(!s) return alert('Bộ không tồn tại');
    const p = [...s.items].slice(0, settings.perSession);
    setActiveSetId(setId);
    setPool(p);
    setIndex(0);
    setTimer(settings.timer);
    setShowNote(false);
    setSelected(null);
  };

  const current = pool[index];

  const playAudio = (text) => {
    try{
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = 'ja-JP';
      speechSynthesis.cancel();
      speechSynthesis.speak(ut);
    }catch(e){}
  };

  const choose = (meaning) => {
    if(!current) return;
    if(showNote) return;
    if(meaning === current.meaning){
      // correct
      onUpdatePoints(1);
      playAudio(current.kana || current.kanji);
      // next immediately
      const ni = index + 1;
      if(ni >= pool.length){ onFinish(); reset(); return; }
      setIndex(ni); setTimer(settings.timer); setSelected(null);
    } else {
      // wrong
      setShowNote(true);
      setSelected(meaning);
    }
  };

  const reset = () => {
    setActiveSetId(null); setPool([]); setIndex(0); setTimer(settings.timer); setShowNote(false); setSelected(null);
  };

  const nextAfterWrong = () => {
    const ni = index + 1;
    if(ni >= pool.length){ onFinish(); reset(); return; }
    setIndex(ni); setTimer(settings.timer); setShowNote(false); setSelected(null);
  };

  if(!activeSetId){
    return (
      <div className="p-4">
        <div className="font-semibold mb-2">Chọn bộ để học</div>
        <div className="space-y-3">
          {sets.map(s=>(
            <div key={s.id} className="flex justify-between items-center p-2 bg-white rounded shadow">
              <div>{s.name}</div>
              <div className="space-x-2">
                <button onClick={()=>start(s.id)} className="px-3 py-1 bg-green-500 text-white rounded">Học ▶</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between">
        <div>⏱ {timer}s</div>
        <div>#{index+1}/{pool.length}</div>
      </div>
      {current ? (
        <>
          <div className="bg-white p-4 rounded shadow text-center">
            <div className="text-2xl font-bold">{current.kanji}</div>
            {showNote && <div className="mt-2 text-sm">{current.kana} — {current.meaning}</div>}
          </div>

          <div className="space-y-3">
            {options.map((o,i)=>(
              <button key={i} onClick={()=>choose(o)} className="w-full p-4 rounded-xl bg-white shadow hover:bg-gray-100 text-left text-base">{o}</button>
            ))}
          </div>

          <div className="flex items-start space-x-3">
            <button onClick={()=>setShowNote(true)} className="px-3 py-2 bg-yellow-300 rounded">Chưa biết</button>
            {showNote && (
              <div className="flex-1">
                <textarea defaultValue={current.note} onBlur={(e)=>{
                  // save note locally
                  const setsLocal = loadLocal('vocabSets', []);
                  const setObj = setsLocal.find(s=>s.id===activeSetId);
                  if(setObj){
                    setObj.items = setObj.items.map(it=> it.id===current.id ? {...it, note: e.target.value, updatedAt: Date.now()} : it);
                    saveLocal('vocabSets', setsLocal);
                  }
                }} className="w-full p-2 border rounded" placeholder="Ghi chú..."></textarea>
                <div className="mt-2 flex justify-end">
                  <button onClick={nextAfterWrong} className="px-3 py-2 bg-blue-500 text-white rounded">Tiếp theo</button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : <div>Không có từ.</div>}
    </div>
  );
}