import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import VocabManager from './components/VocabManager';
import Quiz from './components/Quiz';
import { sampleSets } from './data/wordSets';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { loadLocal, saveLocal } from './utils/storage';
import { toast } from 'react-toastify';

export default function App(){
  const handleBack = ()=>{ setPage('dashboard'); window.scrollTo(0,0); };
  const handleHome = ()=>{ setPage('dashboard'); window.scrollTo(0,0); };
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sets, setSets] = useState(() => loadLocal('vocabSets', sampleSets));
  const [settings, setSettings] = useState(() => loadLocal('settings', { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true }));
  const [pointsToday, setPointsToday] = useState(() => loadLocal('pointsToday', 0));
  const [totalPoints, setTotalPoints] = useState(() => loadLocal('totalPoints', 0));
  const [streak, setStreak] = useState(() => loadLocal('streak', 0));
  const [lastSync, setLastSync] = useState(() => loadLocal('lastSync', null));
  
  // Sửa lỗi ở đây: Cập nhật điểm một cách an toàn
  const handleUpdatePoints = (points) => {
    setPointsToday(prevPoints => {
      const newPoints = prevPoints + points;
      saveLocal('pointsToday', newPoints);
      return newPoints;
    });
    setTotalPoints(prevPoints => {
      const newPoints = prevPoints + points;
      saveLocal('totalPoints', newPoints);
      return newPoints;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'vocabData', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const serverSets = docSnap.data().sets;
            const localMeta = getLocalMeta('vocabSets');
            if (serverSets && (!localMeta || new Date(serverSets.updatedAt) > new Date(localMeta.updatedAt))) {
              setSets(serverSets);
              toast.info('Đã đồng bộ dữ liệu từ server.');
            } else {
              setDoc(docRef, { sets }, { merge: true });
            }
          } else {
            setDoc(docRef, { sets });
          }
        } catch (e) { console.error('Lỗi khi đồng bộ:', e); }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [sets]);
  
  // Logic kiểm tra streak hằng ngày
  useEffect(() => {
    const today = new Date().toDateString();
    const last = loadLocal('lastLogin', null);
    if(last !== today) {
      if(last) {
        // Kiểm tra xem có phải ngày hôm qua không
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if(new Date(last).toDateString() === yesterday.toDateString()){
            setStreak(s => s + 1); // Tiếp tục streak
        } else {
            setStreak(0); // Mất streak nếu không vào ngày hôm qua
        }
      }
      setPointsToday(0);
      saveLocal('pointsToday', 0);
      saveLocal('lastLogin', today);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      toast.info('Đã đăng xuất.');
    } catch (e) {
      console.error(e);
      toast.error('Có lỗi khi đăng xuất.');
    }
  };

  const handleOpenSettings = () => {
    setPage('settings');
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    setPage('dashboard');
  };

  const syncToCloud = async () => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để đồng bộ.');
      return;
    }
    setLastSync(Date.now());
    saveLocal('lastSync', Date.now());
    try {
      await setDoc(doc(db, 'vocabData', user.uid), { sets }, { merge: true });
      toast.success('Đã đồng bộ dữ liệu lên cloud thành công!');
    } catch (e) {
      toast.error('Lỗi khi đồng bộ dữ liệu.');
    }
  };

  const renderPage = () => {
    switch(page){
      case 'dashboard':
        return (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Tổng quan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-center">
                <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{pointsToday}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Điểm hôm nay / {settings.dailyTarget}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-center">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400">{streak}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Ngày liên tiếp</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-center">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">{totalPoints}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Tổng điểm</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <button onClick={()=>setPage('quiz')} className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition">
                Bắt đầu Luyện tập
              </button>
              <button onClick={()=>setPage('vocabManager')} className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition">
                Quản lý Từ vựng
              </button>
              <button onClick={syncToCloud} className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition" disabled={!user}>
                Đồng bộ Cloud
              </button>
            </div>
          </div>
        );
      case 'quiz':
        return <Quiz sets={sets} settings={settings} onFinish={()=>setPage('dashboard')} onUpdatePoints={handleUpdatePoints} />;
      case 'vocabManager':
        return <VocabManager sets={sets} setSets={setSets} db={db} user={user} />;
      case 'settings':
        return <SettingsPage settings={settings} onSave={handleSaveSettings} onBack={()=>setPage('dashboard')} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col items-center">
      <Header 
        title="Luyện từ vựng" 
        onOpenSettings={handleOpenSettings} 
        user={user} 
        onLogout={handleLogout} 
        showBackButton={page !== 'dashboard'} 
        onBack={handleBack}
      />
      <main className="flex-grow container mx-auto p-4 max-w-2xl">
        {loading ? (
          <div className="text-center text-lg mt-10">Đang tải...</div>
        ) : user ? (
          renderPage()
        ) : (
          <AuthForm auth={auth} />
        )}
      </main>
    </div>
  );
}