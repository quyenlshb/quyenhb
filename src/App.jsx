import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import VocabManager from './components/VocabManager';
import Quiz from './components/Quiz';
import { sampleSets } from './data/wordSets';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { loadLocal, saveLocal, getLocalMeta } from './utils/storage';
import { toast } from 'react-toastify';

export default function App(){
  const handleBack = ()=>{ setPage('dashboard'); window.scrollTo(0,0); };
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sets, setSets] = useState(sampleSets);
  const [settings, setSettings] = useState(() => loadLocal('settings', { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true }));
  const [pointsToday, setPointsToday] = useState(() => loadLocal('pointsToday', 0));
  const [totalPoints, setTotalPoints] = useState(() => loadLocal('totalPoints', 0));
  const [streak, setStreak] = useState(() => loadLocal('streak', 0));
  const [lastSync, setLastSync] = useState(() => loadLocal('lastSync', null));
  
  const handleQuizFinish = (correctCount) => {
    const points = correctCount * 2;
    setPointsToday(p => p + points);
    setTotalPoints(p => p + points);
    setPage('dashboard');
    toast.success(`Bạn đã hoàn thành bài luyện tập! +${points} điểm.`);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setPage('dashboard');
      toast.info("Đã đăng xuất.");
    } catch (e) {
      console.error("Lỗi đăng xuất:", e);
      toast.error("Không thể đăng xuất.");
    }
  };

  const syncToCloud = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để đồng bộ!');
      return;
    }
    const userDocRef = doc(db, 'vocabData', user.uid);
    try {
      await setDoc(userDocRef, {
        sets: sets,
        settings: settings,
        pointsToday: pointsToday,
        totalPoints: totalPoints,
        streak: streak,
        lastSync: Date.now()
      }, { merge: true });
      setLastSync(Date.now());
      toast.success('Đồng bộ thành công!');
    } catch(e) {
      console.error("Lỗi khi đồng bộ lên Cloud:", e);
      toast.error('Lỗi đồng bộ Cloud!');
    }
  };

  const syncFromCloud = async (userData) => {
    if (userData.sets) {
      setSets(userData.sets);
    }
    if (userData.settings) {
      setSettings(userData.settings);
    }
    if (userData.pointsToday) {
      setPointsToday(userData.pointsToday);
    }
    if (userData.totalPoints) {
      setTotalPoints(userData.totalPoints);
    }
    if (userData.streak) {
      setStreak(userData.streak);
    }
    if (userData.lastSync) {
      setLastSync(userData.lastSync);
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'vocabData', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          syncFromCloud(docSnap.data());
        } else {
          await setDoc(userDocRef, { sets: sets });
        }
        
        // Listen for real-time updates
        const unsubFirestore = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            syncFromCloud(doc.data());
          }
        });
        return () => unsubFirestore();
      } else {
        setSets(loadLocal('vocabSets', sampleSets));
        setSettings(loadLocal('settings', { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true }));
        setPointsToday(loadLocal('pointsToday', 0));
        setTotalPoints(loadLocal('totalPoints', 0));
        setStreak(loadLocal('streak', 0));
        setLastSync(loadLocal('lastSync', null));
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, [db]);

  useEffect(() => {
    saveLocal('vocabSets', sets);
    saveLocal('settings', settings);
    saveLocal('pointsToday', pointsToday);
    saveLocal('totalPoints', totalPoints);
    saveLocal('streak', streak);
    saveLocal('lastSync', lastSync);
  }, [sets, settings, pointsToday, totalPoints, streak, lastSync]);

  const renderPage = () => {
    if (!user) {
      return <AuthForm auth={auth} />;
    }
    switch (page) {
      case 'dashboard':
        const lastSyncDate = lastSync ? new Date(lastSync).toLocaleString('vi-VN') : 'Chưa đồng bộ';
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Xin chào, {user.displayName || user.email}!</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-6">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h4 className="font-bold">Điểm số</h4>
                <p>Hôm nay: <span className="text-indigo-600 font-bold">{pointsToday}</span></p>
                <p>Tổng cộng: <span className="text-indigo-600 font-bold">{totalPoints}</span></p>
                <p>Mục tiêu: <span className="text-indigo-600 font-bold">{settings.dailyTarget}</span></p>
              </div>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h4 className="font-bold">Tiến độ</h4>
                <p>Số bộ từ: {sets.length}</p>
                <p>Số từ đã học: {sets.reduce((sum, s) => sum + s.items.filter(it => it.masteryLevel > 0).length, 0)}</p>
                <p>Chuỗi: {streak} ngày</p>
                <p className="text-sm text-gray-500">Đồng bộ: {lastSyncDate}</p>
              </div>
            </div>
            <div className="space-y-4">
              <button onClick={() => setPage('quiz')} className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition">
                Bắt đầu Luyện tập
              </button>
              <button onClick={() => setPage('vocabManager')} className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition">
                Quản lý Từ vựng
              </button>
              <button onClick={syncToCloud} className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition" disabled={!user}>
                Đồng bộ Cloud
              </button>
            </div>
          </div>
        );
      case 'quiz':
        return <Quiz sets={sets} settings={settings} onFinish={handleQuizFinish} user={user} db={db} />;
      case 'vocabManager':
        return <VocabManager sets={sets} setSets={setSets} db={db} user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col items-center">
      <Header 
        title="Luyện từ vựng" 
        onOpenSettings={() => {}} 
        user={user} 
        onLogout={handleLogout} 
        showBackButton={page !== 'dashboard'} 
        onBack={handleBack}
      />
      <main className="flex-grow container mx-auto p-4 max-w-2xl">
        {loading ? (
          <div className="text-center py-8">Đang tải...</div>
        ) : renderPage()}
      </main>
    </div>
  );
}