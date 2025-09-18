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
  const [lastSync, setLastSync] = useState(() => loadLocal('lastSync', 0));

  useEffect(()=>{
    saveLocal('vocabSets', sets);
  },[sets]);

  useEffect(()=> saveLocal('settings', settings), [settings]);

  useEffect(()=>{
    saveLocal('pointsToday', pointsToday);
  },[pointsToday]);

  useEffect(()=>{
    saveLocal('totalPoints', totalPoints);
  },[totalPoints]);

  useEffect(()=>{
    saveLocal('streak', streak);
  },[streak]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);
      if(u && navigator.onLine){
        try{
          const docRef = doc(db, 'users', u.uid);
          const snap = await getDoc(docRef);
          const remote = snap.exists() ? snap.data() : null;
          const localMeta = loadLocal('vocabSets', []);
          
          if(!remote || (localMeta && localMeta.updatedAt && localMeta.updatedAt > (remote.vocabSets?.updatedAt||0))){
            await setDoc(docRef, { vocabSets: localMeta, settings, pointsToday, totalPoints, streak, updatedAt: Date.now() });
            setLastSync(Date.now());
          } else {
            if(remote.vocabSets) setSets(remote.vocabSets.data || sampleSets);
            if(remote.settings) setSettings(remote.settings);
            if(remote.pointsToday) setPointsToday(remote.pointsToday);
            if(remote.totalPoints) setTotalPoints(remote.totalPoints);
            if(remote.streak) setStreak(remote.streak);
          }
        }catch(e){ console.log('sync err', e); }
      }
      setLoading(false);
    });
    return ()=> unsub();
  },[]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setPage('auth');
  };

  const updatePoints = (delta) => {
    setPointsToday(p => p + delta);
    setTotalPoints(p => p + delta);
  };

  const finishSession = () => {
    const target = settings.dailyTarget || 0;
    const todayKey = new Date().toISOString().slice(0,10);
    const achieved = pointsToday >= target;
    if(achieved) {
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
    const recKey = 'history_' + todayKey;
    localStorage.setItem(recKey, JSON.stringify({ points: pointsToday, date: todayKey }));
    setPointsToday(0);
    saveLocal('pointsToday', 0);
    toast.info('Phiên học hoàn tất');
    setPage('dashboard');
  };
  
  const showBackButton = page !== 'dashboard' && page !== 'auth';
  const showHomeButton = page !== 'dashboard' && page !== 'auth';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header
        title="Trang học tiếng Nhật của Quyền"
        onOpenSettings={()=>setPage('settings')}
        user={user}
        onLogout={handleLogout}
        onBack={handleBack}
        onHome={handleHome}
        showBackButton={showBackButton}
        showHomeButton={showHomeButton}
      />
      {loading && (
        <div className="flex items-center justify-center p-6 min-h-screen-minus-header">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
            <div className="text-xl font-medium text-gray-700">Đang tải...</div>
          </div>
        </div>
      )}
      {!loading && (
        <div className="p-4 transition-opacity duration-500 ease-in opacity-100">
          {!user && <div className="max-w-md mx-auto transition-opacity duration-500 ease-in opacity-100"><AuthForm auth={auth} /></div>}
          {user && (
            <>
              {page === 'dashboard' && (
                <div className="space-y-4 transition-opacity duration-500 ease-in opacity-100">
                  <div className="bg-gradient-to-r from-yellow-400 to-red-400 text-white rounded-xl p-4 transition-transform duration-300 ease-in-out">
                    <div className="text-xl">🔥 Streak: {streak} ngày</div>
                    <div className="mt-2">🎯 Mục tiêu: {settings.dailyTarget} điểm</div>
                    <div className="mt-2 bg-white/30 rounded-full h-3 overflow-hidden">
                      <div style={{width: `${Math.min(100, (pointsToday/settings.dailyTarget)*100)}%`}} className="bg-white h-3"></div>
                    </div>
                    <div className="mt-2 text-sm">{pointsToday}/{settings.dailyTarget} hôm nay</div>
                  </div>

                  <div className="bg-white rounded-xl p-3 shadow transition-transform duration-300 ease-in-out">
                    <div className="font-semibold mb-2">Các bộ từ</div>
                    {sets.map(s=>(
                      <div key={s.id} className="flex items-center justify-between p-2 border-b transition-transform duration-200 ease-in-out hover:bg-gray-50">
                        <div>{s.name}</div>
                        <div className="space-x-2">
                          <button onClick={()=> setPage('quiz')} className="px-3 py-1 bg-green-500 text-white rounded transition-transform duration-200 ease-in-out hover:bg-green-600 hover:scale-105" onMouseDown={()=>{ localStorage.setItem('activeSet', s.id); }}>Học ▶</button>
                          <button onClick={()=> setPage('vocab')} className="px-3 py-1 bg-gray-200 rounded transition-transform duration-200 ease-in-out hover:bg-gray-300 hover:scale-105">Quản lý ✏️</button>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 text-center">
                      <button onClick={()=> setPage('vocab')} className="px-4 py-2 bg-blue-500 text-white rounded transition-transform duration-200 ease-in-out hover:bg-blue-600 hover:scale-105">+ Thêm / Import bộ từ</button>
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-500">Tổng điểm: {totalPoints}</div>
                </div>
              )}

              {page === 'vocab' && <div className='max-w-xl mx-auto transition-opacity duration-500 ease-in opacity-100'><VocabManager db={db} user={user} /></div>}

              {page === 'quiz' && <div className='max-w-xl mx-auto transition-opacity duration-500 ease-in opacity-100'><Quiz sets={sets} settings={settings} onFinish={finishSession} onUpdatePoints={updatePoints} /></div>}

              {page === 'settings' && <div className='max-w-md mx-auto transition-opacity duration-500 ease-in opacity-100'><SettingsPanel settings={settings} setSettings={setSettings} /></div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ settings, setSettings }){
  const [timer, setTimer] = useState(settings.timer || 10);
  const [perSession, setPerSession] = useState(settings.perSession || 10);
  const [dailyTarget, setDailyTarget] = useState(settings.dailyTarget || 30);

  useEffect(()=>{},[]);

  const save = () => {
    if(dailyTarget < (settings.dailyTarget || 0)){
      toast.error('Mục tiêu chỉ có thể tăng, không thể giảm');
      return;
    }
    const ns = {...settings, timer, perSession, dailyTarget};
    setSettings(ns);
    saveLocal('settings', ns);
    toast.success('Đã lưu cài đặt!');
  };

  return (
    <div className="p-4 bg-white rounded shadow transition-transform duration-300 ease-in-out hover:scale-105">
      <h3 className="font-semibold mb-3">Cài đặt</h3>
      <label className="block text-sm">Thời gian mỗi câu (giây)</label>
      <input type="number" value={timer} onChange={e=>setTimer(Math.max(1, Number(e.target.value)))} className="w-full p-2 border rounded mb-2" />
      <label className="block text-sm">Số từ mỗi lần</label>
      <input type="number" value={perSession} onChange={e=>setPerSession(Math.max(1, Number(e.target.value)))} className="w-full p-2 border rounded mb-2" />
      <label className="block text-sm">Mục tiêu điểm hằng ngày</label>
      <input type="number" value={dailyTarget} onChange={e=>setDailyTarget(Math.max(1, Number(e.target.value)))} className="w-full p-2 border rounded mb-2" />
      <div className="flex space-x-2">
        <button onClick={save} className="px-3 py-2 bg-blue-500 text-white rounded transition-transform duration-200 ease-in-out hover:bg-blue-600 hover:scale-105">Lưu cài đặt</button>
      </div>
    </div>
  );
}