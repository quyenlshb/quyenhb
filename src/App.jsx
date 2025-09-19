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
  const handleBack = ()=>{ setPage('dashboard'); window.scrollTo(0,0); };
  const handleHome = ()=>{ setPage('dashboard'); window.scrollTo(0,0); };
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sets, setSets] = useState(() => loadLocal('vocabSets', sampleSets));
  const [settings, setSettings] = useState(() => loadLocal('settings', { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true }));
  const [pointsToday, setPointsToday] = useState(() => loadLocal('pointsToday', { date: new Date().toDateString(), value: 0 }));
  const [totalPoints, setTotalPoints] = useState(() => loadLocal('totalPoints', 0));
  const [streak, setStreak] = useState(() => loadLocal('streak', 0));
  const [lastSync, setLastSync] = useState(() => loadLocal('lastSync', null));

  const syncWithFirestore = async (updatedSets) => {
    saveLocal('vocabSets', updatedSets);
    setSets(updatedSets);
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { sets: updatedSets }, { merge: true });
      } catch (e) {
        console.error("Lỗi đồng bộ Firestore: ", e);
      }
    }
  };

  const updateWordItem = (setId, wordId, updates) => {
    const updatedSets = sets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          items: set.items.map(item => {
            if (item.id === wordId) {
              return { ...item, ...updates };
            }
            return item;
          })
        };
      }
      return set;
    });
    syncWithFirestore(updatedSets);
  };
  
  const savePoints = async (points) => {
    const today = new Date().toDateString();
    let newStreak = streak;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastSync && new Date(lastSync).toDateString() !== today) {
        if (new Date(lastSync).toDateString() === yesterday.toDateString() && pointsToday.value >= settings.dailyTarget) {
            newStreak = streak + 1;
        } else {
            newStreak = 0;
        }
    }
    
    const newPointsToday = pointsToday.date === today ? pointsToday.value + points : points;
    setPointsToday({ date: today, value: newPointsToday });
    setTotalPoints(prev => prev + points);
    setStreak(newStreak);
    setLastSync(today);

    saveLocal('pointsToday', { date: today, value: newPointsToday });
    saveLocal('totalPoints', totalPoints + points);
    saveLocal('streak', newStreak);
    saveLocal('lastSync', today);

    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            pointsToday: { date: today, value: newPointsToday },
            totalPoints: totalPoints + points,
            streak: newStreak,
            lastSync: today
        });
    }
  };

  const saveSettings = async () => {
    saveLocal('settings', settings);
    if (user) {
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { settings: settings });
            toast.success('Đã lưu cài đặt và đồng bộ với Firebase!');
        } catch (e) {
            console.error("Lỗi đồng bộ cài đặt: ", e);
            toast.error('Có lỗi xảy ra khi lưu cài đặt.');
        }
    } else {
        toast.success('Đã lưu cài đặt!');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.sets) {
                    setSets(userData.sets);
                    saveLocal('vocabSets', userData.sets);
                }
                if (userData.settings) {
                    setSettings(userData.settings);
                    saveLocal('settings', userData.settings);
                }
                if (userData.totalPoints) setTotalPoints(userData.totalPoints);
                if (userData.pointsToday) setPointsToday(userData.pointsToday);
                if (userData.streak) setStreak(userData.streak);
                if (userData.lastSync) setLastSync(userData.lastSync);
                toast.success('Đã đồng bộ dữ liệu người dùng!');
            } else {
                await setDoc(userDocRef, {
                    sets: sets,
                    settings: settings,
                    totalPoints: totalPoints,
                    pointsToday: pointsToday,
                    streak: streak,
                    lastSync: lastSync
                });
            }
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const renderPage = () => {
    if (loading) {
      return <div className="p-4 text-center">Đang tải...</div>;
    }
    if (!user) {
      return <AuthForm auth={auth} />;
    }
    switch (page) {
      case 'dashboard':
        return (
          <div className="p-4 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Chào mừng, {user.displayName || user.email}!</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Tiến độ của bạn</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Hôm nay: {pointsToday.value} / {settings.dailyTarget} điểm</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng điểm: {totalPoints}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Chuỗi ngày học: {streak} ngày</p>
                <button onClick={() => setPage('quiz')} className="mt-4 w-full bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-green-600 transition">Bắt đầu Quiz</button>
                <button onClick={() => setPage('vocab')} className="mt-2 w-full bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition">Quản lý từ vựng</button>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-4 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Cài đặt</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <label className="block text-gray-700 dark:text-gray-300 mb-1">Số từ mỗi lần quiz</label>
              <input type="number" value={settings.perSession} onChange={e=>setSettings({...settings, perSession: Math.max(1, Number(e.target.value))})} className="w-full p-2 border rounded mb-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              <label className="block text-gray-700 dark:text-gray-300 mb-1">Mục tiêu điểm hằng ngày</label>
              <input type="number" value={settings.dailyTarget} onChange={e=>setSettings({...settings, dailyTarget: Math.max(1, Number(e.target.value))})} className="w-full p-2 border rounded mb-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              <button onClick={saveSettings} className="w-full bg-indigo-600 text-white py-2 rounded-lg mt-2 font-bold hover:bg-indigo-700 transition duration-300">Lưu cài đặt</button>
            </div>
          </div>
        );
      case 'vocab':
        return <VocabManager sets={sets} setSets={setSets} user={user} db={db} />;
      case 'quiz':
        return <Quiz sets={sets} settings={settings} onFinish={handleBack} onUpdatePoints={savePoints} user={user} db={db} updateWordItem={updateWordItem} />;
      default:
        return <div className="p-4">Không tìm thấy trang.</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <Header
        title="Web học tiếng Nhật"
        user={user}
        onLogout={() => signOut(auth).then(() => toast.info('Đã đăng xuất.'))}
        onBack={handleBack}
        onHome={handleHome}
        onOpenSettings={() => setPage('settings')}
        showBackButton={page === 'vocab' || page === 'settings' || page === 'quiz'}
        showHomeButton={page !== 'dashboard' && page !== 'auth'}
      />
      <main className="flex-grow">
        {renderPage()}
      </main>
    </div>
  );
}