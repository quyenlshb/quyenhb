import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import VocabManager from './components/VocabManager';
import Quiz from './components/Quiz';
import SettingsPanel from './components/SettingsPanel'; // Import SettingsPanel
import { sampleSets } from './data/wordSets';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { loadLocal, saveLocal } from './utils/storage';
import { toast } from 'react-toastify';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sets, setSets] = useState(() => loadLocal('vocabSets', sampleSets));
  const [settings, setSettings] = useState(() => loadLocal('settings', { timer: 10, perSession: 10, dailyTarget: 30 }));
  const [pointsToday, setPointsToday] = useState(() => loadLocal('pointsToday', 0));
  const [totalPoints, setTotalPoints] = useState(() => loadLocal('totalPoints', 0));
  const [streak, setStreak] = useState(() => loadLocal('streak', 0));
  const [lastSync, setLastSync] = useState(() => loadLocal('lastSync', 0));
  const [lastPractice, setLastPractice] = useState(() => loadLocal('lastPractice', null));
  
  const handleBack = () => { setPage('dashboard'); window.scrollTo(0, 0); };
  const handleHome = () => { setPage('dashboard'); window.scrollTo(0, 0); };
  const handleOpenSettings = () => { setPage('settings'); };
  const handleLogout = () => signOut(auth);

  const getLocalDate = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const handleUpdatePoints = (newPoints) => {
    const today = getLocalDate(Date.now());
    const lastDay = getLocalDate(lastPractice);
    let newStreak = streak;
    if (lastDay && today !== lastDay) {
        if ((new Date(today) - new Date(lastDay)) / (1000 * 60 * 60 * 24) === 1) {
            newStreak++;
        } else {
            newStreak = 1;
        }
    } else if (!lastDay) {
        newStreak = 1;
    }
    setLastPractice(Date.now());
    setStreak(newStreak);
    setPointsToday(p => p + newPoints);
    setTotalPoints(p => p + newPoints);
    toast.success(`+${newPoints} điểm! Bạn đang có chuỗi học liên tiếp ${newStreak} ngày!`);
  };

  const syncToFirestore = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        pointsToday,
        totalPoints,
        streak,
        lastPractice,
        lastSync: Date.now()
      }, { merge: true });
    } catch (e) {
      console.error('Lỗi khi đồng bộ dữ liệu người dùng:', e);
    }
  };

  const syncVocabToFirestore = async (setsToSync) => {
    if (!user) return;
    try {
      const vocabRef = doc(db, 'vocabData', user.uid);
      await setDoc(vocabRef, { sets: setsToSync, lastSync: Date.now() }, { merge: true });
    } catch (e) {
      console.error('Lỗi khi đồng bộ từ vựng:', e);
    }
  };

  const syncFromFirestore = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const vocabRef = doc(db, 'vocabData', user.uid);
      const vocabSnap = await getDoc(vocabRef);

      const localUserMeta = loadLocal('userMeta', null);
      const localVocabMeta = loadLocal('vocabSets', null);
      const localSettings = loadLocal('settings', null);

      if (userSnap.exists()) {
        const remoteData = userSnap.data();
        if (!localUserMeta || remoteData.lastSync > localUserMeta.updatedAt) {
          setPointsToday(remoteData.pointsToday);
          setTotalPoints(remoteData.totalPoints);
          setStreak(remoteData.streak);
          setLastPractice(remoteData.lastPractice);
          saveLocal('pointsToday', remoteData.pointsToday);
          saveLocal('totalPoints', remoteData.totalPoints);
          saveLocal('streak', remoteData.streak);
          saveLocal('lastPractice', remoteData.lastPractice);
          toast.info('Đã đồng bộ dữ liệu người dùng mới nhất từ server.');
        } else {
          syncToFirestore();
        }
      }

      if (vocabSnap.exists()) {
        const remoteVocab = vocabSnap.data();
        if (!localVocabMeta || remoteVocab.lastSync > localVocabMeta.updatedAt) {
          setSets(remoteVocab.sets);
          saveLocal('vocabSets', remoteVocab.sets);
          toast.info('Đã đồng bộ dữ liệu từ vựng mới nhất từ server.');
        } else {
          syncVocabToFirestore(sets);
        }
      } else {
        syncVocabToFirestore(sets);
      }
      
      const settingsRef = doc(db, 'settings', user.uid);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists() && (!localSettings || settingsSnap.data().updatedAt > localSettings.updatedAt)) {
        setSettings(settingsSnap.data().data);
        saveLocal('settings', settingsSnap.data().data);
        toast.info('Đã đồng bộ cài đặt mới nhất từ server.');
      }
      
    } catch (e) {
      console.error('Lỗi khi đồng bộ:', e);
      toast.error('Không thể đồng bộ dữ liệu từ server.');
    } finally {
      setLoading(false);
    }
  };

  const updateSettingsOnFirestore = async (newSettings) => {
    if(!user) return;
    try {
        await setDoc(doc(db, 'settings', user.uid), {
            data: newSettings,
            updatedAt: Date.now()
        }, { merge: true });
    } catch (e) {
        console.error('Lỗi khi cập nhật cài đặt:', e);
        toast.error('Không thể đồng bộ cài đặt với server.');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncFromFirestore();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    saveLocal('pointsToday', pointsToday);
    saveLocal('totalPoints', totalPoints);
    saveLocal('streak', streak);
    saveLocal('lastPractice', lastPractice);
  }, [pointsToday, totalPoints, streak, lastPractice]);

  useEffect(() => {
    saveLocal('settings', settings);
  }, [settings]);

  useEffect(() => {
    saveLocal('vocabSets', sets);
  }, [sets]);

  const renderPage = () => {
    if (loading) return <div className="text-center mt-10">Đang tải...</div>;
    if (!user) return <AuthForm auth={auth} />;

    switch (page) {
      case 'dashboard':
        const today = getLocalDate(Date.now());
        const lastDay = getLocalDate(lastPractice);
        const dailyGoal = settings.dailyTarget;
        const progress = (pointsToday / dailyGoal) * 100;

        // Reset daily points if a new day has started
        if (lastDay && today !== lastDay) {
          setPointsToday(0);
          saveLocal('pointsToday', 0);
        }

        return (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold mb-4">Tổng quan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold">Tổng điểm</h3>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalPoints}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold">Điểm hôm nay</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{pointsToday}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold">Chuỗi học liên tiếp</h3>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{streak} ngày</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">Mục tiêu hằng ngày</h3>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full"
                  style={{ width: `${Math.min(100, progress)}%` }}
                ></div>
              </div>
              <p className="text-sm mt-2">{pointsToday} / {dailyGoal} điểm</p>
              {pointsToday >= dailyGoal && (
                <p className="text-green-600 mt-2 font-semibold">Chúc mừng! Bạn đã đạt mục tiêu hôm nay!</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setPage('quiz')}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition font-bold"
              >
                Bắt đầu Luyện tập
              </button>
              <button
                onClick={() => setPage('vocab')}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition font-bold"
              >
                Quản lý Từ vựng
              </button>
            </div>
          </div>
        );
      case 'vocab':
        return <VocabManager db={db} user={user} />;
      case 'quiz':
        return <Quiz sets={sets} settings={settings} onFinish={() => setPage('dashboard')} onUpdatePoints={handleUpdatePoints} />;
      case 'settings':
        return <SettingsPanel settings={settings} setSettings={setSettings} onUpdateSettings={updateSettingsOnFirestore} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col">
      <Header
        title="My JP App"
        user={user}
        onOpenSettings={handleOpenSettings}
        onLogout={handleLogout}
        onBack={handleBack}
        onHome={handleHome}
        showBackButton={page === 'vocab' || page === 'quiz' || page === 'settings'}
        showHomeButton={false}
      />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {renderPage()}
      </main>
    </div>
  );
}