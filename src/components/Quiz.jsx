import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaPlay, FaPause } from 'react-icons/fa';
import { doc, updateDoc } from 'firebase/firestore';

export default function Quiz({ sets, settings, onFinish, onUpdatePoints, db, user }){
  const [activeSetId, setActiveSetId] = useState(null);
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(settings.timer);
  const [showNote, setShowNote] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Tải bộ từ đang hoạt động từ localStorage
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

  // Logic tạo đáp án
  useEffect(() => {
    if (pool.length > 0) {
      const current = pool[index];
      const otherWords = sets.find(s => s.id === activeSetId)?.items.filter(w => w.id !== current.id) || [];
      const shuffledOthers = otherWords.sort(() => 0.5 - Math.random());
      const randomOptions = shuffledOthers.slice(0, 3).map(w => w.meaning);
      const allOptions = [...randomOptions, current.meaning].sort(() => 0.5 - Math.random());
      setOptions(allOptions);
      setSelected(null);
      setShowNote(false);
      setTimer(settings.timer);
    }
  }, [index, pool, sets, activeSetId, settings]);

  const start = (setId) => {
    const selectedSet = sets.find(s => s.id === setId);
    if (!selectedSet || selectedSet.items.length === 0) {
      toast.error('Bộ từ không có từ nào để luyện tập.');
      return;
    }
    localStorage.setItem('activeSet', setId);
    setActiveSetId(setId);
    setPool(selectedSet.items.sort(() => 0.5 - Math.random()));
    setIndex(0);
    toast.success('Bắt đầu luyện tập!');
  };

  const checkAnswer = (option) => {
    if(selected !== null) return;
    setSelected(option);
    if(option === pool[index].meaning){
      onUpdatePoints(1);
      toast.success('Chính xác!', { autoClose: 1000 });
      setTimeout(nextWord, 1500);
    } else {
      toast.error('Sai rồi!', { autoClose: 1000 });
      setShowNote(true);
    }
  };

  const nextWord = () => {
    if(index + 1 >= pool.length){
      onFinish();
      toast.info('Đã hoàn thành bộ từ!');
    } else {
      setIndex(index + 1);
    }
  };
  
  const saveNote = async (newNote) => {
    if (!user) return; // Không lưu nếu chưa đăng nhập
    const currentWord = pool[index];
    const userVocabDocRef = doc(db, `artifacts/${__app_id}/users/${user.uid}/vocabSets/${activeSetId}`);
    
    // Tìm và cập nhật ghi chú của từ đó
    // Đây là cách hiệu quả hơn so với việc đọc/ghi toàn bộ mảng từ vựng
    try {
        await updateDoc(userVocabDocRef, {
            'items': sets.find(s => s.id === activeSetId).items.map(it => 
                it.id === currentWord.id ? { ...it, note: newNote, updatedAt: Date.now() } : it
            )
        });
        toast.success('Đã lưu ghi chú!');
    } catch (e) {
        console.error("Lỗi khi lưu ghi chú:", e);
        toast.error('Lỗi khi lưu ghi chú, vui lòng thử lại.');
    }
  };
  
  if(!activeSetId){
    return (
      <div className="container mx-auto p-4 sm:p-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Luyện tập từ vựng</h3>
          <p className="mb-4 text-gray-700">Chọn một bộ từ để bắt đầu luyện tập:</p>
          <div className="space-y-3">
            {sets.map(s => (
              <button key={s.id} onClick={() => start(s.id)} className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200">
                {s.name} ({s.items.length} từ)
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const current = pool[index];

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center">
        <div className="text-sm text-gray-500 mb-2">Từ {index + 1} / {pool.length}</div>
        <div className="text-4xl font-bold mb-4">{current.kanji}</div>
        
        <div className="text-6xl font-extrabold text-indigo-600 mb-4 transition-transform duration-300">
          {timer}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
          {options.map((o, idx) => (
            <button
              key={idx}
              onClick={() => checkAnswer(o)}
              className={`
                p-4 rounded-lg shadow-md text-lg font-semibold transition-colors duration-200
                ${selected === o ? 
                  (o === current.meaning ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 
                  'bg-gray-100 hover:bg-gray-200'
                }
              `}
              disabled={selected !== null}
            >
              {o}
            </button>
          ))}
        </div>

        {showNote && (
          <div className="mt-6 p-6 bg-gray-100 rounded-xl shadow-inner w-full">
            <div className="text-xl font-bold text-gray-800">Đáp án: {current.meaning}</div>
            <div className="text-lg font-medium text-gray-600">Kana: {current.kana}</div>
            <textarea
              defaultValue={current.note}
              onBlur={(e) => saveNote(e.target.value)}
              className="w-full mt-4 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Thêm ghi chú cá nhân..."
            ></textarea>
            <div className="mt-4 flex justify-end">
              <button onClick={nextWord} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200">
                Từ tiếp theo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
