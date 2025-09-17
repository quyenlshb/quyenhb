import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { toast } from 'react-toastify';
import { FaPlay, FaPause } from 'react-icons/fa';

export default function Quiz({ sets, settings, onFinish, onUpdatePoints }){
  const [activeSetId, setActiveSetId] = useState(null);
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [showNote, setShowNote] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const activeSetId = localStorage.getItem('activeSet');
    if (activeSetId) {
      start(activeSetId);
    }
  }, []);

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
    if (pool.length > 0) {
      const current = pool[index];
      const allMeanings = sets.flatMap(set => set.items.map(item => item.meaning));
      const uniqueMeanings = [...new Set(allMeanings)];

      const correctMeaning = current.meaning;
      const incorrectOptions = [];

      while (incorrectOptions.length < 3 && uniqueMeanings.length > 1) {
        const randomMeaning = uniqueMeanings[Math.floor(Math.random() * uniqueMeanings.length)];
        if (randomMeaning !== correctMeaning && !incorrectOptions.includes(randomMeaning)) {
          incorrectOptions.push(randomMeaning);
        }
      }

      const newOptions = [correctMeaning, ...incorrectOptions];
      newOptions.sort(() => Math.random() - 0.5);
      setOptions(newOptions);
    }
  }, [index, pool, sets]);

  const start = (setId) => {
    const s = sets.find(x=>x.id===setId);
    if(!s) return toast.error('Bộ không tồn tại');
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
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      speechSynthesis.speak(utterance);
    } catch(e) {
      console.log('Audio error:', e);
    }
  };

  const choose = (choice) => {
    if(selected) return;
    const isCorrect = choice === current.meaning;
    setSelected(choice);
    if(isCorrect){
      onUpdatePoints(1);
      toast.success('Chính xác! +1 điểm', { autoClose: 1500 });
      setTimeout(() => {
        setIndex(i => i + 1);
        setTimer(settings.timer);
        setSelected(null);
      }, 1500);
    } else {
      setShowNote(true);
      toast.error('Chưa chính xác.', { autoClose: 1500 });
    }
  };

  const nextAfterWrong = () => {
    setIndex(i => i + 1);
    setTimer(settings.timer);
    setShowNote(false);
    setSelected(null);
  };

  if(!activeSetId || !pool.length) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Luyện tập từ vựng</h2>
        <div className="text-center text-gray-500">
          Vui lòng chọn một bộ từ từ trang chủ.
        </div>
      </div>
    );
  }

  if(index >= pool.length) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Hoàn thành!</h2>
        <p className="text-center text-gray-500">Bạn đã hoàn thành phiên học này.</p>
        <button onClick={onFinish} className="mt-4 w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-transform duration-200 ease-in-out hover:scale-105">
          Kết thúc phiên
        </button>
      </div>
    );
  }

  const progress = (index / pool.length) * 100;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm">Câu hỏi {index + 1}/{pool.length}</span>
        <div className="relative w-32 h-2 bg-gray-200 rounded-full">
          <div className="absolute h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="flex items-center space-x-1">
          <div className="text-lg font-bold w-8 text-right">{timer}</div>
          <button onClick={() => playAudio(current.kana)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-transform duration-200 ease-in-out hover:scale-110">
            <FaPlay />
          </button>
        </div>
      </div>

      <div className="text-3xl font-bold text-center mb-6">
        {current.kanji}
      </div>

      <div className="space-y-3">
        {options.map((o,i)=>(
          <button
            key={i}
            onClick={()=>choose(o)}
            disabled={selected !== null}
            className={`
              w-full p-4 rounded-xl shadow text-left text-base transition-colors duration-200
              ${selected === null ? 'bg-blue-100 hover:bg-blue-200' : ''}
              ${selected !== null && o !== selected ? 'opacity-50' : ''}
              ${selected === o && o === current.meaning ? 'bg-green-400' : ''}
              ${selected === o && o !== current.meaning ? 'bg-red-400' : ''}
              ${selected === o && o === current.meaning ? 'hover:bg-green-400' : ''}
              ${selected === o && o !== current.meaning ? 'hover:bg-red-400' : ''}
            `}
          >
            {o}
          </button>
        ))}
      </div>

      {showNote && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg shadow-inner">
          <div className="text-lg font-semibold">Đáp án:</div>
          <div className="text-xl font-bold mt-1">{current.kana} - {current.meaning}</div>
          <textarea
            defaultValue={current.note}
            onBlur={(e)=>{
              // save note locally
              const setsLocal = loadLocal('vocabSets', []);
              const setObj = setsLocal.find(s=>s.id===activeSetId);
              if(setObj){
                setObj.items = setObj.items.map(it=> it.id===current.id ? {...it, note: e.target.value, updatedAt: Date.now()} : it);
                saveLocal('vocabSets', setsLocal);
                toast.success('Đã lưu ghi chú!');
              }
            }}
            className="w-full p-3 border border-gray-300 rounded-lg mt-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Thêm ghi chú cá nhân..."
          ></textarea>
          <div className="flex justify-end mt-2">
            <button onClick={nextAfterWrong} className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-transform duration-200 ease-in-out hover:scale-105">
              Tiếp theo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}