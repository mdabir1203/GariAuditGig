
import React, { useState, useEffect, useMemo } from 'react';
import { AuditJob, AuditStatus, VehicleDefect, UserWallet } from './types';
import CameraModule from './components/CameraModule';
import Auth from './components/Auth';
import { analyzeVehicleDefect, verifyRegistrationCard } from './services/geminiService';
import { dbService, UserProfile } from './services/dbService';

const MOCK_JOBS: AuditJob[] = [
  { id: '1', carModel: 'Toyota Corolla 2021', licensePlate: 'DHK-1234', location: 'Gulshan 2', distance: '1.2 km', estimatedTime: '25 min', reward: 450, status: AuditStatus.AVAILABLE, images: {}, defects: [] },
  { id: '2', carModel: 'Honda Civic 2018', licensePlate: 'DHK-5678', location: 'Banani', distance: '0.8 km', estimatedTime: '35 min', reward: 600, status: AuditStatus.AVAILABLE, images: {}, defects: [] },
  { id: '3', carModel: 'Nissan X-Trail 2023', licensePlate: 'DHK-9012', location: 'Uttara', distance: '4.5 km', estimatedTime: '45 min', reward: 800, status: AuditStatus.AVAILABLE, images: {}, defects: [] }
];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'gigs' | 'wallet' | 'profile'>('gigs');
  const [jobs, setJobs] = useState<AuditJob[]>(MOCK_JOBS);
  const [selectedJob, setSelectedJob] = useState<AuditJob | null>(null);
  const [wallet, setWallet] = useState<UserWallet>({ balance: 0, currency: 'BDT', transactions: [] });
  const [cameraActive, setCameraActive] = useState<{ active: boolean; label: string; mode: 'car' | 'defect' | 'doc' }>({ active: false, label: '', mode: 'car' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [showZenBreak, setShowZenBreak] = useState(false);

  useEffect(() => {
    if (user) setWallet(prev => ({ ...prev, balance: user.balance }));
    
    // Zen Break Logic: Remind user to breathe every 20 mins of session
    const timer = setTimeout(() => {
      if (user && !selectedJob) setShowZenBreak(true);
    }, 1200000); 

    return () => clearTimeout(timer);
  }, [user, selectedJob]);

  const handleLoginSuccess = (profile: UserProfile) => setUser(profile);

  const capturePhoto = (label: string, mode: 'car' | 'defect' | 'doc' = 'car') => {
    setCameraActive({ active: true, label, mode });
  };

  const handleCaptureComplete = async (base64: string) => {
    if (!selectedJob) return;
    setCameraActive({ active: false, label: '', mode: 'car' });

    if (cameraActive.mode === 'car') {
      const partKey = cameraActive.label.toLowerCase() as keyof AuditJob['images'];
      setSelectedJob({ ...selectedJob, images: { ...selectedJob.images, [partKey]: base64 } });
    } else if (cameraActive.mode === 'doc') {
      setIsAnalyzing(true);
      const result = await verifyRegistrationCard(base64, selectedJob.licensePlate, selectedJob.carModel);
      setSelectedJob({ ...selectedJob, images: { ...selectedJob.images, registrationCard: base64 }, registrationVerified: result.verified });
      setIsAnalyzing(false);
    } else if (cameraActive.mode === 'defect') {
      setIsAnalyzing(true);
      const aiResponse = await analyzeVehicleDefect(base64);
      const newDefect: VehicleDefect = {
        id: Math.random().toString(36).substr(2, 9),
        image: base64,
        part: "Component",
        severity: aiResponse.toLowerCase().includes('high') ? 'high' : 'low',
        description: "Visual Check",
        aiAnalysis: aiResponse
      };
      setSelectedJob({ ...selectedJob, defects: [...selectedJob.defects, newDefect] });
      setIsAnalyzing(false);
    }
  };

  const submitAudit = async () => {
    if (!selectedJob || !user) return;
    setIsAnalyzing(true);
    
    // Simulate safety network sync
    setTimeout(async () => {
      const newBalance = user.balance + selectedJob.reward;
      await dbService.updateBalance(user.email, newBalance);
      setUser({ ...user, balance: newBalance, stats: { ...user.stats, impactPoints: user.stats.impactPoints + 1 } });
      setJobs(jobs.filter(j => j.id !== selectedJob.id));
      setSelectedJob(null);
      setIsAnalyzing(false);
      alert("Excellent work, Guardian. Safety data uploaded and payment secured.");
    }, 2000);
  };

  const photoCount = selectedJob ? ['front', 'rear', 'left', 'right'].filter(p => !!(selectedJob.images as any)?.[p]).length : 0;
  const progress = selectedJob ? ((photoCount + (selectedJob.registrationVerified ? 1 : 0)) / 5) * 100 : 0;

  if (!user) return <Auth onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="h-screen max-w-md mx-auto relative flex flex-col bg-[#f8fafc] overflow-hidden">
      
      {/* Healing Header */}
      <header className="glass-nav sticky top-0 z-50 px-6 py-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div className="flex flex-col leading-none">
            <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Guardian<span className="text-blue-600">Portal</span></h1>
            <span className="text-[9px] font-bold text-teal-600 uppercase tracking-widest mt-0.5">Protecting the Roads</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Value Earned</span>
          <span className="text-xl font-black text-gray-900">৳{wallet.balance}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-28">
        
        {activeTab === 'gigs' && !selectedJob && (
          <div className="space-y-6 page-transition">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Available Missions</h2>
                <p className="text-xs text-gray-500 font-medium">Find vehicles needing your safety expertise.</p>
              </div>
              <div className="flex flex-col items-center p-2 bg-blue-50 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-black text-blue-600 uppercase">Streak</span>
                <span className="text-sm font-black text-blue-800">{user.stats.streak}d</span>
              </div>
            </div>

            {jobs.map(job => (
              <div key={job.id} className="glass-card rounded-[2rem] p-6 hover:shadow-xl transition-all active:scale-[0.98] border-white/50 group">
                <div className="flex justify-between mb-4">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full uppercase tracking-widest mb-2 inline-block">Safety Check</span>
                    <h3 className="text-xl font-extrabold text-gray-900 leading-none">{job.carModel}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tighter">{job.licensePlate}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-blue-600">৳{job.reward}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-4 border-t border-gray-100/50 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-gray-600">{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-gray-600">{job.estimatedTime}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedJob({ ...job, status: AuditStatus.IN_PROGRESS })}
                  className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  Start Mission
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedJob && (
          <div className="space-y-6 page-transition">
             <div className="flex items-center gap-4">
                <button onClick={() => setSelectedJob(null)} className="p-3 glass-card rounded-2xl active:scale-90 transition-all">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-gray-900 leading-tight">{selectedJob.carModel}</h2>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Safety Mission In-Progress</span>
                </div>
             </div>

             <div className="glass-card rounded-[2rem] p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Inspection Integrity</span>
                  <span className="text-xs font-black text-blue-600">{Math.round(progress)}% Verified</span>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter ml-1">Step 1: Visual Proof</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['Front', 'Rear', 'Left', 'Right'].map(pos => {
                    const hasImg = !!(selectedJob.images as any)[pos.toLowerCase()];
                    return (
                      <button 
                        key={pos} 
                        onClick={() => capturePhoto(pos)}
                        className={`aspect-[4/3] rounded-[1.5rem] border-2 transition-all flex flex-col items-center justify-center relative overflow-hidden ${hasImg ? 'border-teal-400 shadow-teal-100 shadow-inner' : 'border-dashed border-gray-200 bg-white'}`}
                      >
                        {hasImg ? (
                          <img src={(selectedJob.images as any)[pos.toLowerCase()]} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{pos}</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
             </div>

             <div className="glass-card rounded-[2rem] p-6 space-y-4">
               <div className="flex justify-between items-center">
                 <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Step 2: Document Authenticity</h3>
                 {selectedJob.registrationVerified && <span className="text-[9px] bg-teal-500 text-white px-3 py-1 rounded-full font-black uppercase">Verified</span>}
               </div>
               <button 
                onClick={() => capturePhoto('Registration', 'doc')}
                className={`w-full py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${selectedJob.images.registrationCard ? 'bg-teal-50/50 border-teal-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
               >
                 {selectedJob.images.registrationCard ? (
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-10 h-10 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs font-black text-teal-700 uppercase">Document Scanned Successfully</span>
                    </div>
                 ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                      <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">Scan Blue Book / Smart Card</span>
                    </>
                 )}
               </button>
             </div>

             <button 
                disabled={progress < 100}
                onClick={submitAudit}
                className={`w-full py-6 rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95 ${progress < 100 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-200 hover:brightness-110'}`}
             >
               {progress < 100 ? 'Complete All Steps' : 'Finalize Mission'}
             </button>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-6 page-transition">
            <div className="glass-card rounded-[2.5rem] p-8 text-center bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-1000"></div>
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Reward Balance</p>
              <h2 className="text-5xl font-black tracking-tighter mb-4">৳{wallet.balance.toLocaleString()}</h2>
              <div className="bg-white/10 rounded-2xl py-2 px-4 inline-flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Auditor Tier: {user.stats.level}</span>
              </div>
            </div>

            <section className="glass-card rounded-[2rem] p-8 space-y-6">
               <h3 className="text-sm font-black uppercase text-gray-900 tracking-tighter">Value Exchange</h3>
               <div className="space-y-4">
                 <input 
                  type="tel" 
                  placeholder="bKash Number" 
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-pink-500 rounded-2xl px-5 py-4 font-bold outline-none transition-all"
                  value={bkashNumber}
                  onChange={e => setBkashNumber(e.target.value)}
                 />
                 <input 
                  type="number" 
                  placeholder="Amount" 
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-pink-500 rounded-2xl px-5 py-4 font-black text-2xl outline-none transition-all"
                  value={withdrawalAmount}
                  onChange={e => setWithdrawalAmount(e.target.value)}
                 />
                 <button 
                  onClick={() => alert("Withdrawal sync initiated with Google Sheets and bKash.")}
                  className="w-full bg-gradient-to-r from-pink-600 to-pink-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-pink-200 active:scale-95 transition-all"
                 >
                   Withdraw via bKash
                 </button>
               </div>
            </section>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 page-transition">
            <div className="flex flex-col items-center py-8">
              <div className="w-32 h-32 rounded-[3rem] bg-white border-8 border-white shadow-2xl overflow-hidden mb-6 soft-pulse">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">{user.name}</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Safety Guardian Level {user.stats.level}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
               {[
                 { label: 'Impact', val: user.stats.impactPoints },
                 { label: 'Trust', val: `${user.stats.trustScore}%` },
                 { label: 'Level', val: user.stats.level }
               ].map(s => (
                 <div key={s.label} className="glass-card p-5 rounded-[2rem] text-center shadow-sm">
                   <p className="text-xl font-black text-gray-900">{s.val}</p>
                   <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{s.label}</p>
                 </div>
               ))}
            </div>

            <div className="glass-card rounded-[2rem] p-6 space-y-4">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">System Connection</h3>
              <div className="space-y-4">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg></div>
                    <span className="text-sm font-bold text-gray-700">Google Sheets Sync Active</span>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                    <span className="text-sm font-bold text-gray-700">Passkey Secured</span>
                 </div>
              </div>
            </div>

            <button onClick={() => setUser(null)} className="w-full py-5 text-red-500 font-black text-xs uppercase tracking-[0.2em] rounded-3xl border-2 border-red-50 transition-all hover:bg-red-50 active:scale-95">Sign Out</button>
          </div>
        )}
      </main>

      {/* Modern Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 glass-nav flex justify-around items-center px-4 rounded-[2.5rem] shadow-2xl z-50 border border-white/40">
        {[
          { id: 'gigs', label: 'Safety', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
          { id: 'wallet', label: 'Value', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
          { id: 'profile', label: 'Me', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.icon} /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Zen Break Overlay */}
      {showZenBreak && (
        <div className="fixed inset-0 z-[200] bg-blue-900/40 backdrop-blur-3xl flex items-center justify-center p-8 page-transition">
           <div className="glass-card w-full max-w-sm rounded-[3rem] p-10 text-center space-y-6 shadow-3xl">
              <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto soft-pulse">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">Time for a <br/> Safety Breath</h2>
              <p className="text-sm text-gray-500 font-medium">You've been helping the community for a while. Take 60 seconds to rest your eyes and breathe deeply.</p>
              <button 
                onClick={() => setShowZenBreak(false)}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                I'm Re-energized
              </button>
           </div>
        </div>
      )}

      {cameraActive.active && (
        <CameraModule
          label={cameraActive.label}
          onClose={() => setCameraActive({ active: false, label: '', mode: 'car' })}
          onCapture={handleCaptureComplete}
        />
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 z-[200] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-black text-blue-800 uppercase tracking-widest">Gemini AI Partner Inspecting...</span>
        </div>
      )}
    </div>
  );
};

export default App;
