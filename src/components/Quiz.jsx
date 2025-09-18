import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { toast } from 'react-toastify';
import { doc, updateDoc } from 'firebase/firestore';

export default function Quiz({ sets, settings, onFinish, onUpdatePoints, user, db }){
  const [activeSetId, setActiveSetId] = useState(null);
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [showNote, setShowNote] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Khởi tạo Audio
  const playAudio = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      speechSynthesis.speak(utterance);
    } else {
      console.warn("Trình duyệt của bạn không hỗ trợ Speech Synthesis API.");
    }
  };

  useEffect(() => {
    const activeSetId = localStorage.getItem('activeSet');
    if (activeSetId) {
      start(activeSetId);
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      setTimer(settings.timer);
    }
  }, [settings, isPlaying]);

  useEffect(() => {
    let t;
    // Chạy hoặc dừng timer
    if (isPlaying && pool.length && timer > 0 && !showNote) {
      t = setTimeout(() => setTimer(timer - 1), 1000);
    }
    // Hết giờ, hiển thị đáp án và ghi chú
    if (timer === 0 && isPlaying && !showNote && selected === null) {
      setShowNote(true);
    }
    return () => clearTimeout(t);
  }, [timer, pool, showNote, selected, isPlaying]);

  useEffect(() => {
    if (pool.length > 0) {
      const current = pool[index];
      const allMeanings = sets.flatMap(s => s.items).map(item => item.meaning);
      
      // Lấy 3 đáp án sai ngẫu nhiên
      const fakeOptions = allMeanings
        .filter(meaning => meaning !== current.meaning)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      const allOptions = [...fakeOptions, current.meaning];
      setOptions(allOptions.sort(() => 0.5 - Math.random()));
    }
  }, [index, pool, sets]);

  const start = (setId) => {
    const activeSet = sets.find(s=>s.id === setId);
    if(activeSet && activeSet.items.length > 0){
      setActiveSetId(setId);
      const shuffled = activeSet.items.sort(() => 0.5 - Math.random());
      const selectedPool = shuffled.slice(0, settings.perSession);
      setPool(selectedPool);
      setIndex(0);
      setTimer(settings.timer);
      setIsPlaying(true);
    } else {
      toast.error('Bộ từ không hợp lệ hoặc rỗng!');
      onFinish();
    }
  };

  const handleSelect = (option) => {
    setShowNote(true);
    setSelected(option);
    if (option === pool[index].meaning) {
      onUpdatePoints(1);
      toast.success('Chính xác!', { autoClose: 1000, hideProgressBar: true });
      playAudio(pool[index].kanji || pool[index].kana);
      // Tự động chuyển câu sau 2 giây
      setTimeout(() => {
        nextQuestion();
      }, 2000);
    } else {
      toast.error('Sai rồi!', { autoClose: 1000, hideProgressBar: true });
    }
  };

  const nextQuestion = () => {
    if(index + 1 < pool.length){
      setIndex(index + 1);
      setShowNote(false);
      setSelected(null);
      setTimer(settings.timer);
    } else {
      onFinish();
      localStorage.removeItem('activeSet');
    }
  };

  const handleSkip = () => {
    setShowNote(true);
    setSelected('skipped'); // Sử dụng giá trị đặc biệt để đánh dấu đã bỏ qua
    toast.info('Đã bỏ qua câu này.');
  };

  if(!isPlaying){
    return (
      <div className="bg-white p-6 rounded-xl shadow-md text-center">
        <h3 className="text-xl font-bold mb-4">Luyện tập từ vựng</h3>
        <p className="text-gray-600 mb-6">Vui lòng chọn một bộ từ để bắt đầu luyện tập.</p>
        <button onClick={onFinish} className="px-5 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg shadow-md hover:bg-gray-300 transition duration-300">Quay lại</button>
      </div>
    );
  }

  const current = pool[index];

  return (
    <div className='space-y-6'>
      <div className="p-4 bg-white rounded-xl shadow-md text-center">
        <div className="text-gray-500 text-sm">Từ {index + 1} / {pool.length}</div>
        <div className="text-4xl font-extrabold text-indigo-600 my-4">
          {current.kanji}
        </div>
        <div className="text-lg text-gray-500 mb-4">{current.kana}</div>

        <div className="text-3xl font-bold text-gray-800">
          {showNote && selected !== 'skipped' ? current.meaning : timer}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map(o => (
          <button
            key={o}
            onClick={() => handleSelect(o)}
            disabled={showNote}
            className={`
              p-4 rounded-lg shadow transition duration-200
              ${showNote ? (o === current.meaning ? 'bg-green-500 text-white' : (selected === o ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed')) : 'bg-blue-600 text-white hover:bg-blue-700'}
              ${showNote && selected === o && o !== current.meaning ? 'hover:bg-red-400' : ''}
            `}
          >
            {o}
          </button>
        ))}
        {!showNote && (
          <button
            onClick={handleSkip}
            className="p-4 rounded-lg shadow transition duration-200 bg-gray-300 text-gray-800 hover:bg-gray-400 col-span-1 sm:col-span-2"
          >
            Chưa biết
          </button>
        )}
      </div>

      {showNote && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg shadow-inner">
          <div className="text-lg font-semibold">Đáp án:</div>
          <div className="text-xl font-bold mt-1">{current.kana} - {current.meaning}</div>
          <textarea
            defaultValue={current.note}
            onBlur={async (e) => {
              const setsLocal = loadLocal('vocabSets', []);
              const setObj = setsLocal.find(s=>s.id===activeSetId);
              if(setObj){
                const updatedItems = setObj.items.map(it => it.id === current.id ? { ...it, note: e.target.value, updatedAt: Date.now() } : it);
                setObj.items = updatedItems;
                saveLocal('vocabSets', setsLocal);

                if (user) {
                  try {
                    await updateDoc(doc(db, 'users', user.uid), {
                      vocabSets: setsLocal,
                    });
                    toast.success('Đã lưu ghi chú và đồng bộ với Firebase!');
                  } catch (error) {
                    console.error("Lỗi khi đồng bộ ghi chú: ", error);
                    toast.error('Có lỗi xảy ra khi đồng bộ dữ liệu. Vui lòng thử lại.');
                  }
                }
              }
            }}
            className="w-full p-3 border border-gray-300 rounded-lg mt-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Thêm ghi chú cá nhân..."
          ></textarea>
          <div className="flex justify-end mt-2">
            <button onClick={nextQuestion} className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">Tiếp tục</button>
          </div>
        </div>
      )}
    </div>
  );
}