import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';

export default function Quiz({ sets, settings, onFinish, onUpdatePoints }){
  const [activeSetId, setActiveSetId] = useState(null);
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [showNote, setShowNote] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    setTimer(settings.timer);
  }, [settings]);

  useEffect(() => {
    let t;
    if(pool.length && timer>0 && !showNote && selected === null){
      t = setTimeout(()=> setTimer(timer-1), 1000);
    }
    if(timer===0 && pool.length && !showNote && selected === null){
      setShowNote(true);
    }
    return ()=> clearTimeout(t);
  }, [timer, pool, showNote, selected]);

  useEffect(() => {
    if(pool.length > 0) {
      const current = pool[index];
      const newOptions = [];
      newOptions.push(current.meaning);
      while(newOptions.length < 4){
        const other = pool[Math.floor(Math.random() * pool.length)];
        if(other && !newOptions.includes(other.meaning)) {
          newOptions.push(other.meaning);
        }
        if(pool.length < 4) break;
      }
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
    setSelected(meaning);
    if(meaning === current.meaning){
      onUpdatePoints(1);
      playAudio(current.kana || current.kanji);
      setTimeout(() => {
        const ni = index + 1;
        if(ni >= pool.length){ onFinish(); reset(); return; }
        setIndex(ni); setTimer(settings.timer); setSelected(null);
      }, 500); // Tăng thời gian chờ để người dùng kịp nhận biết đáp án đúng
    } else {
      setShowNote(true);
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
      <div className="p-6 bg-gray-50 min-h-screen">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Chọn bộ từ vựng để học</h2>
        <div className="space-y-4">
          {sets.map(s=>(
            <div key={s.id} className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-md">
              <div className="text-lg text-gray-800 font-medium">{s.name}</div>
              <button onClick={()=>start(s.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition">
                Học <span className="ml-1">▶</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getOptionClasses = (meaning) => {
    if (selected === null) {
      return "bg-white hover:bg-gray-100";
    }
    if (meaning === current.meaning) {
      return "bg-green-500 text-white";
    }
    if (selected === meaning) {
      return "bg-red-500 text-white";
    }
    return "bg-white";
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center text-gray-600 mb-4">
        <div className="flex items-center space-x-1">
          <span className="text-xl">⏱</span>
          <span className="font-semibold">{timer}s</span>
        </div>
        <div className="font-semibold text-lg">#{index+1}/{pool.length}</div>
      </div>
      {current ? (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center mb-6">
            <div className="text-4xl font-bold text-gray-800 mb-2">{current.kanji}</div>
            {showNote && <div className="mt-2 text-md text-gray-600 font-medium">{current.kana} — {current.meaning}</div>}
          </div>

          <div className="space-y-3 mb-6">
            {options.map((o,i)=>(
              <button
                key={i}
                onClick={()=>choose(o)}
                disabled={selected !== null}
                className={`w-full p-4 rounded-xl shadow-md text-left text-base transition-colors duration-200 ${getOptionClasses(o)}`}
              >
                {o}
              </button>
            ))}
          </div>

          {showNote && (
            <div className="bg-white p-4 rounded-xl shadow-md space-y-3">
              <div className="text-gray-600 font-medium">Ghi chú từ này</div>
              <textarea
                defaultValue={current.note}
                onBlur={(e)=>{
                  const setsLocal = loadLocal('vocabSets', []);
                  const setObj = setsLocal.find(s=>s.id===activeSetId);
                  if(setObj){
                    setObj.items = setObj.items.map(it=> it.id===current.id ? {...it, note: e.target.value, updatedAt: Date.now()} : it);
                    saveLocal('vocabSets', setsLocal);
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Thêm ghi chú cá nhân..."
              ></textarea>
              <div className="flex justify-end">
                <button onClick={nextAfterWrong} className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
                  Tiếp theo
                </button>
              </div>
            </div>
          )}

          {!showNote && (
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowNote(true)} className="px-5 py-2 bg-yellow-400 text-gray-800 rounded-lg shadow hover:bg-yellow-500 transition">
                Chưa biết
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="p-6 text-center text-gray-500">
          Không có từ. Vui lòng thêm từ mới.
        </div>
      )}
    </div>
  );
}