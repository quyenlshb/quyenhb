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
  const [pointsToday, setPointsToday] = useState(() => loadLocal('pointsToday', 0));
  const [totalPoints, setTotalPoints] = useState(() => loadLocal('totalPoints', 0));
  const [streak, setStreak] = useState(() => loadLocal('streak', 0));
  const [lastSync, setLastSync] = useState(() => loadLocal('lastSync', null));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if(currentUser){
        const userRef = doc(db, 'users', currentUser.uid);
        try{
          const docSnap = await getDoc(userRef);
          if(docSnap.exists()){
            const data = docSnap.data();
            if (data.settings) setSettings(data.settings);
            if (data.sets) setSets(data.sets);
            if (data.pointsToday) setPointsToday(data.pointsToday);
            if (data.totalPoints) setTotalPoints(data.totalPoints);
            if (data.streak) setStreak(data.streak);
          } else {
            // Create user document if not exists
            await setDoc(userRef, { settings, sets, pointsToday, totalPoints, streak });
          }
        }catch(e){
          console.error("Error fetching user data:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    saveLocal('vocabSets', sets);
    saveLocal('settings', settings);
    saveLocal('pointsToday', pointsToday);
    saveLocal('totalPoints', totalPoints);
    saveLocal('streak', streak);
  }, [sets, settings, pointsToday, totalPoints, streak]);

  const syncWithFirestore = async () => {
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          settings,
          sets,
          pointsToday,
          totalPoints,
          streak,
        }, { merge: true });
        toast.success('Đồng bộ dữ liệu thành công!');
        setLastSync(Date.now());
        saveLocal('lastSync', Date.now());
      } catch (e) {
        console.error("Lỗi đồng bộ Firestore: ", e);
        toast.error('Có lỗi xảy ra khi đồng bộ dữ liệu.');
      }
    }
  };

  const saveSettings = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { settings });
        toast.success('Đã lưu cài đặt!');
      } catch (e) {
        console.error("Lỗi lưu cài đặt: ", e);
        toast.error('Không thể lưu cài đặt.');
      }
    }
    saveLocal('settings', settings);
    toast.success('Đã lưu cài đặt!');
  };

  const savePoints = async (newPoints) => {
    const newPointsToday = pointsToday + newPoints;
    const newTotalPoints = totalPoints + newPoints;
    setPointsToday(newPointsToday);
    setTotalPoints(newTotalPoints);

    let newStreak = streak;
    if (newPointsToday >= settings.dailyTarget) {
      const today = new Date().toDateString();
      const lastStreakDate = localStorage.getItem('lastStreakDate');
      if (lastStreakDate !== today) {
        newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem('lastStreakDate', today);
        toast.success(`Tuyệt vời! Bạn đã duy trì streak ${newStreak} ngày!`);
      }
    }

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          pointsToday: newPointsToday,
          totalPoints: newTotalPoints,
          streak: newStreak,
        });
      } catch (e) {
        console.error("Lỗi lưu điểm: ", e);
      }
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center items-center min-h-screen-minus-header">Đang tải...</div>;
    }

    if (!user) {
      return <AuthForm auth={auth} />;
    }

    switch (page) {
      case 'dashboard':
        const progress = Math.min(100, (pointsToday / settings.dailyTarget) * 100) || 0;
        return (
          <div className="flex flex-col items-center justify-center p-4 space-y-6 md:space-y-8 min-h-screen-minus-header bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            <div className="w-full max-w-2xl text-center">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-2 transition-colors duration-300">Chào mừng trở lại, {user.displayName || 'người bạn'}!</h1>
            </div>

            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              {/* Streak Card */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center transition-transform duration-300 hover:scale-105">
                <p className="text-4xl font-bold text-red-500 mb-1">🔥 {streak}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Streak ngày</p>
              </div>

              {/* Daily Progress Card */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center transition-transform duration-300 hover:scale-105">
                <p className="text-sm text-gray-500 dark:text-gray-400">Tiến độ hôm nay</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                  <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-sm font-semibold mt-2 text-gray-700 dark:text-gray-300">{pointsToday} / {settings.dailyTarget} điểm</p>
              </div>

              {/* Total Points Card */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center transition-transform duration-300 hover:scale-105">
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">{totalPoints}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng điểm</p>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <button
                onClick={() => setPage('quiz')}
                className="w-full px-6 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg transition-transform duration-300 hover:scale-105 hover:bg-indigo-700"
              >
                Bắt đầu học ngay
              </button>
              <button
                onClick={() => setPage('vocab')}
                className="w-full px-6 py-4 bg-gray-200 text-gray-800 text-lg font-bold rounded-xl shadow-lg transition-transform duration-300 hover:scale-105 hover:bg-gray-300"
              >
                Quản lý từ vựng
              </button>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex justify-center items-center p-4 md:p-8 min-h-screen-minus-header bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow transition-transform duration-300 ease-in-out w-full max-w-md">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Cài đặt</h3>
              <label className="block text-sm text-gray-700 dark:text-gray-300">Thời gian mỗi câu (giây)</label>
              <input type="number" value={settings.timer} onChange={e=>setSettings({...settings, timer: Math.max(1, Number(e.target.value))})} className="w-full p-2 border rounded mb-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              <label className="block text-sm text-gray-700 dark:text-gray-300">Số từ mỗi lần</label>
              <input type="number" value={settings.perSession} onChange={e=>setSettings({...settings, perSession: Math.max(1, Number(e.target.value))})} className="w-full p-2 border rounded mb-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              <label className="block text-sm text-gray-700 dark:text-gray-300">Mục tiêu điểm hằng ngày</label>
              <input type="number" value={settings.dailyTarget} onChange={e=>setSettings({...settings, dailyTarget: Math.max(1, Number(e.target.value))})} className="w-full p-2 border rounded mb-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              <button onClick={saveSettings} className="w-full bg-indigo-600 text-white py-2 rounded-lg mt-2 font-bold hover:bg-indigo-700 transition duration-300">Lưu cài đặt</button>
            </div>
          </div>
        );
      case 'vocab':
        return <VocabManager sets={sets} setSets={setSets} user={user} db={db} />;
      case 'quiz':
        return <Quiz sets={sets} settings={settings} onFinish={handleBack} onUpdatePoints={savePoints} user={user} db={db} />;
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
        showBackButton={page === 'settings' || page === 'quiz' || page === 'vocab'}
        showHomeButton={page !== 'dashboard' && user}
      />
      <main className="flex-1 flex justify-center items-center p-4">
        {renderContent()}
      </main>
    </div>
  );
}