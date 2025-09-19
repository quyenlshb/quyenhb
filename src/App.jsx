import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import VocabManager from './components/VocabManager';
import Quiz from './components/Quiz';
import { sampleSets } from './data/wordSets';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { loadLocal, saveLocal } from './utils/storage';
import { toast } from 'react-toastify';

export default function App(){
  const handleBack = ()=>{ setPage({name: 'dashboard'}); window.scrollTo(0,0); };
  const handleHome = ()=>{ setPage({name: 'dashboard'}); window.scrollTo(0,0); };
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState({ name: 'dashboard', data: null });
  const [sets, setSets] = useState(() => loadLocal('vocabSets', sampleSets));
  const [settings, setSettings] = useState(() => loadLocal('settings', { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true }));
  const [pointsToday, setPointsToday] = useState(() => loadLocal('pointsToday', { date: new Date().toDateString(), value: 0 }));
  const [totalPoints, setTotalPoints] = useState(() => loadLocal('totalPoints', 0));
  const [streak, setStreak] = useState(() => loadLocal('streak', 0));
  const [lastSync, setLastSync] = useState(() => loadLocal('lastSync', null));
  
  const updateWordItem = (setId, wordId, updates) => {
    const updatedSets = sets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          items: set.items.map(item =>
            item.id === wordId ? { ...item, ...updates } : item
          ),
          updatedAt: Date.now()
        };
      }
      return set;
    });
    setSets(updatedSets);
    saveLocal('vocabSets', updatedSets);
  };
  
  const savePoints = (value) => {
    const today = new Date().toDateString();
    let newPointsToday = { ...pointsToday };
    if (newPointsToday.date !== today) {
      newPointsToday = { date: today, value: value };
      const lastDate = new Date(pointsToday.date);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setStreak(diffDays === 1 ? streak + 1 : 0);
    } else {
      newPointsToday = { ...newPointsToday, value: newPointsToday.value + value };
    }
    setPointsToday(newPointsToday);
    setTotalPoints(totalPoints + value);
    saveLocal('pointsToday', newPointsToday);
    saveLocal('totalPoints', totalPoints + value);
    saveLocal('streak', streak);
  };

  const syncToFirestore = async (successMsg = 'Đồng bộ thành công!') => {
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          sets: sets,
          settings: settings,
          pointsToday: pointsToday,
          totalPoints: totalPoints,
          streak: streak
        }, { merge: true });
        setLastSync(Date.now());
        saveLocal('lastSync', Date.now());
        toast.success(successMsg);
      } catch (e) {
        console.error("Lỗi đồng bộ Firestore: ", e);
        toast.error('Có lỗi xảy ra khi đồng bộ dữ liệu.');
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setSets(userData.sets || sets);
          setSettings(userData.settings || settings);
          setPointsToday(userData.pointsToday || pointsToday);
          setTotalPoints(userData.totalPoints || totalPoints);
          setStreak(userData.streak || streak);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const startQuiz = () => {
    const activeSetId = localStorage.getItem('activeSet');
    const setObj = sets.find(s => s.id === activeSetId);

    if (!setObj || setObj.items.length === 0) {
      toast.error('Bộ từ này không có từ vựng nào!');
      return;
    }
    
    const allItems = setObj.items;
    const sortedItems = [...allItems].sort((a, b) => (a.points || 0) - (b.points || 0));

    let newPool = [];
    const perSession = settings.perSession || 10;
    while (newPool.length < perSession) {
      const remaining = perSession - newPool.length;
      const toAdd = sortedItems.slice(0, remaining > sortedItems.length ? sortedItems.length : remaining);
      newPool = [...newPool, ...toAdd];
      if (toAdd.length === 0) break;
    }
    
    for (let i = newPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPool[i], newPool[j]] = [newPool[j], newPool[i]];
    }
    
    setPage({ name: 'quiz', data: { pool: newPool, activeSetId: activeSetId } });
    window.scrollTo(0, 0);
  };

  const saveSettings = () => {
    saveLocal('settings', settings);
    if(user){
      setDoc(doc(db, 'users', user.uid), { settings: settings }, { merge: true });
      toast.success('Đã lưu cài đặt và đồng bộ với Firebase!');
    } else {
      toast.success('Đã lưu cài đặt!');
    }
  };
  
  const renderPage = () => {
    switch (page.name) {
      case 'dashboard':
        const selectedSet = sets.find(s=>s.id === localStorage.getItem('activeSet'));
        return (
          <div className="p-4 md:p-8 min-h-screen-minus-header">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white text-center md:text-left">Dashboard</h1>
            <div className="flex flex-col md:flex-row items-stretch md:space-x-4 mb-6">
              <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md flex items-center mb-4 md:mb-0">
                <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full mr-4 text-blue-600 dark:text-blue-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Điểm hôm nay</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{pointsToday.value} / {settings.dailyTarget}</div>
                </div>
              </div>
              <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full mr-4 text-green-600 dark:text-green-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Chuỗi ngày học</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{streak}</div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Bộ từ đang học</h2>
              <div className="mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{selectedSet?.name || 'Chưa chọn bộ từ nào'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedSet ? `${selectedSet.items.length} từ vựng` : ''}</p>
              </div>
              <button onClick={() => setPage({name: 'vocab'})} className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition duration-300">
                Quản lý từ vựng
              </button>
            </div>
            
            <button onClick={startQuiz} className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600 transition duration-300">
                Bắt đầu Quiz
            </button>
            
          </div>
        );
      case 'auth':
        return <AuthForm auth={auth} />;
      case 'settings':
        return (
          <div className="p-4 md:p-8 min-h-screen-minus-header max-w-lg mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Cài đặt</h1>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
              <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-300">Số từ mỗi lần quiz</label>
              <input type="number" value={settings.perSession} onChange={e=>setSettings({...settings, perSession: Math.max(1, Number(e.target.value))})} className="w-full p-2 border rounded mb-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-300">Mục tiêu điểm hàng ngày</label>
              <input type="number" value={settings.dailyTarget} onChange={e=>setSettings({...settings, dailyTarget: Math.max(1, Number(e.target.value))})} className="w-full p-2 border rounded mb-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              <button onClick={saveSettings} className="w-full bg-indigo-600 text-white py-2 rounded-lg mt-2 font-bold hover:bg-indigo-700 transition duration-300">Lưu cài đặt</button>
            </div>
          </div>
        );
      case 'vocab':
        return <VocabManager sets={sets} setSets={setSets} user={user} db={db} />;
      case 'quiz':
        return <Quiz pool={page.data.pool} activeSetId={page.data.activeSetId} settings={settings} onFinish={handleBack} onUpdatePoints={savePoints} user={user} db={db} updateWordItem={updateWordItem} sets={sets} />;
      default:
        return <div className="p-4">Không tìm thấy trang.</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <Header
        title="Web học tiếng Nhật"
        user={user}
        onLogout={() => signOut(auth).then(() => toast.info('Đã đăng xuất.'))}
        onBack={handleBack}
        onHome={handleHome}
        onOpenSettings={() => setPage({name: 'settings'})}
        onOpenVocab={() => setPage({name: 'vocab'})}
        onLogin={() => setPage({name: 'auth'})}
        onSync={syncToFirestore}
        showBackButton={page.name !== 'dashboard' && page.name !== 'auth'}
        showHomeButton={page.name === 'auth' || page.name === 'settings' || page.name === 'vocab' || page.name === 'quiz'}
      />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}