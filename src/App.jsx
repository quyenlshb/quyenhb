import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import VocabManager from './components/VocabManager';
import Quiz from './components/Quiz';
import { sampleSets } from './data/wordSets';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'; // Thêm updateDoc
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
  const [lastCheck, setLastCheck] = useState(() => loadLocal('lastCheck', null));
  
  const savePoints = (newPoints) => {
    setPointsToday(newPoints);
    setTotalPoints(p=> p + newPoints);
    saveLocal('pointsToday', newPoints);
    saveLocal('totalPoints', totalPoints + newPoints);
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Khi đăng xuất, reset state về giá trị ban đầu và không cần đồng bộ
      setSets(loadLocal('vocabSets', sampleSets));
      setSettings(loadLocal('settings', { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true }));
      setPointsToday(loadLocal('pointsToday', 0));
      setTotalPoints(loadLocal('totalPoints', 0));
      setStreak(loadLocal('streak', 0));
      toast.info('Đã đăng xuất!');
    } catch (error) {
      toast.error('Lỗi khi đăng xuất.');
      console.error(error);
    }
  };
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSets(userData.vocabSets || loadLocal('vocabSets', sampleSets));
          setSettings(userData.settings || loadLocal('settings', { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true }));
          setPointsToday(userData.pointsToday || loadLocal('pointsToday', 0));
          setTotalPoints(userData.totalPoints || loadLocal('totalPoints', 0));
          setStreak(userData.streak || loadLocal('streak', 0));
          toast.success('Dữ liệu đã được đồng bộ với Firebase!');
        } else {
          // Nếu đây là người dùng mới, lưu dữ liệu ban đầu lên Firestore
          await setDoc(userDocRef, {
            email: currentUser.email,
            vocabSets: sets,
            settings: settings,
            pointsToday: pointsToday,
            totalPoints: totalPoints,
            streak: streak,
          });
          toast.success('Tạo tài khoản thành công!');
        }
      } else {
        // Khi đăng xuất, reset state về giá trị ban đầu và không cần đồng bộ
        setSets(loadLocal('vocabSets', sampleSets));
        setSettings(loadLocal('settings', { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true }));
        setPointsToday(loadLocal('pointsToday', 0));
        setTotalPoints(loadLocal('totalPoints', 0));
        setStreak(loadLocal('streak', 0));
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const saveSettings = () => {
    const newSettings = { timer, perSession, dailyTarget };
    setSettings(newSettings);
    saveLocal('settings', newSettings);
    if(user){
      updateDoc(doc(db, 'users', user.uid), {
        settings: newSettings,
      });
    }
    toast.success('Đã lưu cài đặt!');
  };
  
  const [timer, setTimer] = useState(settings.timer || 10);
  const [perSession, setPerSession] = useState(settings.perSession || 10);
  const [dailyTarget, setDailyTarget] = useState(settings.dailyTarget || 30);
  
  return (
    <div className='bg-gray-50 min-h-screen'>
      <Header
        title="Học Tiếng Nhật"
        user={user}
        onLogout={handleLogout}
        onBack={handleBack}
        onHome={handleHome}
        showBackButton={page === 'quiz' || page === 'vocab' || page === 'settings' || page === 'auth'}
        showHomeButton={page !== 'dashboard'}
      />
      <div className='max-w-xl mx-auto px-4 pt-4 pb-12'>
        {loading ? (
          <div className="text-center py-10 text-gray-500">Đang tải...</div>
        ) : (
          <>
            {page === 'auth' && <AuthForm auth={auth} />}
            {page === 'dashboard' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-bold mb-3">Thống kê</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-indigo-600">{pointsToday}</div>
                      <div className="text-sm text-gray-500">Điểm hôm nay</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-indigo-600">{totalPoints}</div>
                      <div className="text-sm text-gray-500">Tổng điểm</div>
                    </div>
                  </div>
                </div>
                <button onClick={()=>setPage('quiz')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-blue-700 transition duration-300">
                  Luyện tập
                </button>
                <button onClick={()=>setPage('vocab')} className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-lg shadow-md hover:bg-gray-300 transition duration-300">
                  Quản lý từ vựng
                </button>
                <div className="p-4 bg-white rounded shadow transition-transform duration-300 ease-in-out hover:scale-105">
                  <h3 className="font-semibold mb-3">Cài đặt</h3>
                  <label className="block text-sm">Thời gian mỗi câu (giây)</label>
                  <input type="number" value={timer} onChange={e=>setTimer(Math.max(1, Number(e.target.value)))} className="w-full p-2 border rounded mb-2" />
                  <label className="block text-sm">Số từ mỗi lần</label>
                  <input type="number" value={perSession} onChange={e=>setPerSession(Math.max(1, Number(e.target.value)))} className="w-full p-2 border rounded mb-2" />
                  <label className="block text-sm">Mục tiêu điểm hằng ngày</label>
                  <input type="number" value={dailyTarget} onChange={e=>setDailyTarget(Math.max(1, Number(e.target.value)))} className="w-full p-2 border rounded mb-2" />
                  <button onClick={saveSettings} className="w-full bg-indigo-500 text-white py-2 rounded-lg mt-2">Lưu cài đặt</button>
                </div>
              </div>
            )}
            {page === 'vocab' && <VocabManager sets={sets} setSets={setSets} user={user} db={db} />}
            {page === 'quiz' && <Quiz sets={sets} settings={settings} onFinish={handleBack} onUpdatePoints={savePoints} user={user} db={db} />}
          </>
        )}
      </div>
    </div>
  );
}