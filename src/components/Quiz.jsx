import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { toast } from 'react-toastify';
import { FaPlay, FaPause, FaRedo, FaArrowLeft } from 'react-icons/fa';

export default function Quiz({ sets, settings, onFinish, onUpdatePoints }) {
  const [activeSetId, setActiveSetId] = useState(null);
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [showNote, setShowNote] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0); // Thêm biến trạng thái cho điểm số

  const generateQuiz = (setId) => {
    const activeSet = sets.find(s => s.id === setId);
    if (!activeSet || activeSet.items.length === 0) {
      toast.error('Bộ từ này không có từ nào để luyện tập.');
      return;
    }

    const shuffled = activeSet.items.sort(() => 0.5 - Math.random());
    const newPool = shuffled.slice(0, settings.perSession);
    
    setActiveSetId(setId);
    setPool(newPool);
    setIndex(0);
    setScore(0);
    setIsPlaying(true);
    localStorage.setItem('activeSet', setId);
  };

  useEffect(() => {
    const activeSetId = localStorage.getItem('activeSet');
    if (activeSetId) {
      generateQuiz(activeSetId);
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      setTimer(settings.timer);
    }
  }, [isPlaying, settings]);

  useEffect(() => {
    let t;
    if (pool.length > 0 && index < pool.length && timer > 0 && !showNote && selected === null) {
      t = setTimeout(() => setTimer(timer - 1), 1000);
    }
    if (timer === 0 && pool.length > 0 && index < pool.length && !showNote && selected === null) {
      handleWrongAnswer();
    }
    return () => clearTimeout(t);
  }, [timer, pool, index, showNote, selected]);

  useEffect(() => {
    if (pool.length > 0 && index < pool.length) {
      const current = pool[index];
      const allMeanings = sets.flatMap(s => s.items.map(i => i.meaning));
      const filteredMeanings = allMeanings.filter(m => m !== current.meaning);
      const shuffledMeanings = filteredMeanings.sort(() => 0.5 - Math.random());
      const wrongOptions = shuffledMeanings.slice(0, 3);
      const newOptions = [current.meaning, ...wrongOptions].sort(() => 0.5 - Math.random());
      setOptions(newOptions);
      setTimer(settings.timer);
      setSelected(null);
      setShowNote(false);
    } else if (isPlaying) {
      endQuiz();
    }
  }, [index, pool, sets, settings, isPlaying]);

  const checkAnswer = (option) => {
    setSelected(option);
    const current = pool[index];
    if (option === current.meaning) {
      setScore(s => s + 1);
      toast.success('Chính xác! (+1 điểm)');
      setTimeout(nextQuestion, 1000);
    } else {
      toast.error('Sai rồi.');
      setShowNote(true);
    }
  };

  const handleWrongAnswer = () => {
    setSelected('wrong');
    setShowNote(true);
  };

  const nextQuestion = () => {
    if (index < pool.length - 1) {
      setIndex(index + 1);
    } else {
      endQuiz();
    }
  };

  const endQuiz = () => {
    setIsPlaying(false);
    onUpdatePoints(score);
    toast.success(`Đã hoàn thành bài luyện tập. Bạn đạt được ${score} điểm!`);
    onFinish();
  };

  const playKana = () => {
    if (pool.length > 0 && 'speechSynthesis' in window) {
      const current = pool[index];
      const utter = new SpeechSynthesisUtterance(current.kana);
      utter.lang = 'ja-JP';
      window.speechSynthesis.speak(utter);
    } else {
      toast.error('Trình duyệt của bạn không hỗ trợ phát âm.');
    }
  };
  
  const current = pool[index];

  if (!activeSetId) {
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-xl font-bold text-center">Bắt đầu Luyện tập</h3>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <label className="block text-sm font-medium mb-1">Chọn bộ từ để luyện tập</label>
          <select onChange={e => generateQuiz(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:border-blue-500">
            <option value="">-- Chọn một bộ từ --</option>
            {sets.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.items.length} từ)</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (pool.length === 0 || index >= pool.length) {
    return (
      <div className="p-4 text-center space-y-4">
        <h3 className="text-2xl font-bold">Bài luyện tập đã kết thúc!</h3>
        <p className="text-lg">Bạn đã đạt được <span className="text-green-500 font-bold">{score}</span> điểm trong phiên này.</p>
        <button onClick={onFinish} className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition font-bold">
          Quay lại Tổng quan
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex justify-between items-center">
        <div className="text-lg font-bold">Câu hỏi: {index + 1}/{pool.length}</div>
        <div className="text-lg font-bold">Điểm: {score}</div>
        <div className="text-2xl font-bold text-red-500">{timer}s</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
        <h2 onClick={playKana} className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer">{current.kanji}</h2>
        <button onClick={playKana} className="mt-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition">
          <FaPlay className="inline-block mr-1" /> Nghe cách đọc
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((o, i) => (
          <button
            key={i}
            onClick={() => selected === null && checkAnswer(o)}
            className={`
              p-4 rounded-lg font-semibold text-lg transition
              ${selected === null ? 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600' : ''}
              ${selected === o ? (o === current.meaning ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : ''}
              ${selected !== null && o === current.meaning ? 'bg-green-500 text-white' : ''}
              ${selected !== null && selected !== current.meaning && o !== selected ? 'bg-gray-200 dark:bg-gray-700' : ''}
            `}
            disabled={selected !== null}
          >
            {o}
          </button>
        ))}
      </div>

      {showNote && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-inner">
          <div className="text-lg font-semibold">Đáp án:</div>
          <div className="text-xl font-bold mt-1">{current.kana} - {current.meaning}</div>
          <textarea
            defaultValue={current.note}
            onBlur={(e) => {
              const setsLocal = loadLocal('vocabSets', []);
              const setObj = setsLocal.find(s => s.id === activeSetId);
              if (setObj) {
                setObj.items = setObj.items.map(it => it.id === current.id ? { ...it, note: e.target.value, updatedAt: Date.now() } : it);
                saveLocal('vocabSets', setsLocal);
                toast.success('Đã lưu ghi chú!');
              }
            }}
            className="w-full p-3 border border-gray-300 rounded-lg mt-3 text-gray-800 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Thêm ghi chú cá nhân..."
          ></textarea>
          <div className="flex justify-end mt-2">
            <button onClick={nextQuestion} className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
              Tiếp tục <FaArrowLeft className="inline-block ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}