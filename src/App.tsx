import React, { useState } from 'react';
import { 
  Home, 
  BarChart2, 
  Trophy, 
  User, 
  Heart, 
  Flame, 
  Star, 
  Calendar, 
  Utensils, 
  Trash2, 
  Dog, 
  Check, 
  Plus, 
  ChevronRight,
  Camera,
  AlertTriangle,
  MessageCircle,
  Shield,
  Gavel,
  X,
  Moon,
  Sun,
  CheckCircle2,
  RefreshCw,
  ArrowUpDown,
  Filter,
  Book,
  Wrench,
  Brush,
  Music,
  Gamepad2,
  ShoppingBag,
  Coffee,
  Bath,
  Bed,
  Shirt,
  LogIn,
  LogOut,
  Users,
  CreditCard,
  Percent,
  Zap,
  ChefHat,
  Droplets
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { View, Task, Member, Payment, Alert, ChatMessage, Appeal } from './types';
import { INITIAL_TASKS, MEMBERS } from './constants';

const IconMap: Record<string, any> = {
  Utensils,
  Trash2,
  Dog,
  Check,
  Plus,
  Shield,
  Gavel,
  Book,
  Wrench,
  Brush,
  Music,
  Gamepad2,
  ShoppingBag,
  Coffee,
  Bath,
  Bed,
  Shirt,
  ChefHat,
  Droplets
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<View>('login');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [members, setMembers] = useState<Member[]>(MEMBERS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [user, setUser] = useState<Member>(MEMBERS[0]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', userId: 'admin', userName: 'Admin', userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', text: '¡Bienvenidos al chat familiar! Recuerden completar sus tareas antes del domingo.', timestamp: new Date().toISOString(), isAdminAlert: true },
  ]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [payments, setPayments] = useState<Payment[]>([
    { id: '1', userId: 'styven', userName: 'Styven', amount: 5000, date: new Date().toISOString(), status: 'pending', type: 'fine' },
    { id: '2', userId: 'isabella', userName: 'Isabella', amount: 2000, date: new Date().toISOString(), status: 'pending', type: 'fine' },
  ]);

  const [paymentConfig, setPaymentConfig] = useState({
    type: 'nequi' as 'nequi' | 'bancolombia',
    number: '3024468046',
    owner: 'Admin'
  });

  // Weekly cleanup of images
  React.useEffect(() => {
    const now = new Date();
    setTasks(prev => prev.map(t => {
      if (t.completedAt) {
        const completedDate = new Date(t.completedAt);
        const diffDays = (now.getTime() - completedDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) {
          return { ...t, imageUrl: undefined };
        }
      }
      return t;
    }));
  }, []);

  const isDarkMode = user.settings?.darkMode || false;

  const handleLogin = (email: string, pass: string) => {
    const foundUser = members.find(m => m.email === email && m.password === pass);
    if (foundUser) {
      setUser(foundUser);
      setIsLoggedIn(true);
      setCurrentView('dashboard');
    } else {
      alert('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('login');
  };

  const handleUpdateUser = (updatedUser: Member) => {
    setUser(updatedUser);
    setMembers(prev => prev.map(m => m.id === updatedUser.id ? updatedUser : m));
  };

  const handleCreateUser = (newUser: Member) => {
    setMembers(prev => [...prev, newUser]);
  };

  const handleApprovePayment = (paymentId: string) => {
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'approved' } : p));
  };

  const handleRejectPayment = (paymentId: string) => {
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'rejected' } : p));
  };

  const handlePassTask = (task: Task) => {
    setSelectedTask(task);
    setCurrentView('pass-task');
  };

  const handleCompleteTask = (taskId: string, proof?: string) => {
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, status: 'completed', imageUrl: proof, completedAt: now };
      }
      return t;
    }));
    setCurrentView('dashboard');
  };

  const handleStartVoting = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isVotingActive: true, votes: [] } : t));
    alert('Votación iniciada para esta tarea.');
  };

  const handleCastVote = (taskId: string, userId: string, vote: 'good' | 'bad') => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const existingVotes = t.votes || [];
        const filteredVotes = existingVotes.filter(v => v.userId !== userId);
        return { ...t, votes: [...filteredVotes, { userId, vote }] };
      }
      return t;
    }));
  };

  const handleValidateTask = (taskId: string, approved: boolean, customDebtChange?: number) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;

      let nextTasks = prev.map(t => {
        if (t.id === taskId) {
          return { ...t, status: (approved ? 'validated' : 'failed') as any, isVotingActive: false };
        }
        return t;
      });

      if (approved) {
        const userId = task.assignedTo;
        if (userId) {
          setMembers(mems => mems.map(m => {
            if (m.id === userId) {
              const debtChange = customDebtChange !== undefined ? customDebtChange : (task.value || 0);
              return { 
                ...m, 
                debt: m.debt + debtChange,
                xp: m.xp + task.xp,
                progress: Math.min(100, m.progress + 5)
              };
            }
            return m;
          }));
        }
      } else {
        // Penalty logic
        const badVotes = task.votes?.filter(v => v.vote === 'bad').length || 0;
        const goodVotes = task.votes?.filter(v => v.vote === 'good').length || 0;
        
        if (task.isVotingActive && badVotes > goodVotes) {
          const userId = task.assignedTo;
          if (userId) {
            const penaltyTask1: Task = {
              ...task,
              id: `penalty-1-${Date.now()}`,
              title: `[PENALIDAD] ${task.title} (1/2)`,
              status: 'pending',
              taskType: 'obligation',
              penaltyMultiplier: 2,
              isVotingActive: false,
              votes: [],
              imageUrl: undefined,
              completedAt: undefined
            };
            const penaltyTask2: Task = {
              ...task,
              id: `penalty-2-${Date.now()}`,
              title: `[PENALIDAD] ${task.title} (2/2)`,
              status: 'pending',
              taskType: 'obligation',
              penaltyMultiplier: 2,
              isVotingActive: false,
              votes: [],
              imageUrl: undefined,
              completedAt: undefined
            };
            nextTasks.push(penaltyTask1, penaltyTask2);
            alert('La mayoría votó "Mal Ejecutado". Se han asignado 2 obligaciones de penalidad con costo doble.');
          }
        }
      }
      return nextTasks;
    });
  };

  const filteredTasks = tasks.filter(t => !t.assignedTo || t.assignedTo === user.id);

  const renderView = () => {
    if (!isLoggedIn && currentView !== 'login') {
      return <LoginScreen onLogin={handleLogin} darkMode={isDarkMode} />;
    }

    switch (currentView) {
      case 'login':
        return <LoginScreen onLogin={handleLogin} darkMode={isDarkMode} />;
      case 'dashboard':
        return <Dashboard tasks={filteredTasks} user={user} setView={setCurrentView} onPassTask={handlePassTask} onCompleteDuty={(id) => {
          const task = tasks.find(t => t.id === id);
          if (task) {
            if (task.taskType === 'duty') {
              handleCompleteTask(id);
            } else {
              setSelectedTask(task);
              setCurrentView('upload');
            }
          }
        }} isDarkMode={isDarkMode} />;
      case 'admin':
        return (
          <AdminDashboard 
            members={members} 
            payments={payments}
            tasks={tasks}
            onApprovePayment={handleApprovePayment}
            onRejectPayment={handleRejectPayment}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onValidateTask={handleValidateTask}
            onStartVoting={handleStartVoting}
            onAddAlert={(a) => setAlerts(prev => [a, ...prev])}
            onAssignTask={(taskId, userId) => {
              setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignedTo: userId } : t));
              alert(`Tarea asignada con éxito`);
            }}
            onDeleteTask={(taskId) => {
              setTasks(prev => prev.filter(t => t.id !== taskId));
              alert('Tarea eliminada');
            }}
            setView={setCurrentView} 
            currentUser={user}
            paymentConfig={paymentConfig}
            onUpdatePaymentConfig={setPaymentConfig}
          />
        );
      case 'upload':
        return <UploadEvidence task={selectedTask} setView={setCurrentView} onComplete={(proof) => handleCompleteTask(selectedTask?.id || '', proof)} />;
      case 'alert':
        return <AlertScreen alerts={alerts} setView={setCurrentView} user={user} onAddAlert={(a) => setAlerts(prev => [a, ...prev])} />;
      case 'voting':
        return <VotingScreen setView={setCurrentView} tasks={tasks} members={members} user={user} onCastVote={handleCastVote} />;
      case 'ranking':
        return <RankingScreen setView={setCurrentView} />;
      case 'settlement':
        return <SettlementScreen setView={setCurrentView} user={user} tasks={tasks} paymentConfig={paymentConfig} isDarkMode={isDarkMode} />;
      case 'invitation':
        return <InvitationScreen setView={setCurrentView} />;
      case 'chat':
        return <ChatScreen messages={messages} user={user} setView={setCurrentView} onSendMessage={(msg) => setMessages(prev => [...prev, msg])} onDeleteMessage={(id) => setMessages(prev => prev.filter(m => m.id !== id))} />;
      case 'profile':
        return <ProfileScreen user={user} onUpdateUser={handleUpdateUser} setView={setCurrentView} onLogout={handleLogout} currentUser={user} />;
      case 'pass-task':
        return <PassTaskScreen task={selectedTask} setView={setCurrentView} />;
      case 'confirm-payments':
        return <ConfirmPayments setView={setCurrentView} />;
      case 'create-task':
        return <CreateTaskScreen members={members} setView={setCurrentView} onSave={(newTask, repeatDays) => {
          if (repeatDays) {
            const newTasks: Task[] = [];
            for (let i = 0; i < 7; i++) {
              const date = new Date('2026-03-02T10:15:28-08:00');
              date.setDate(date.getDate() + i);
              const dayName = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
              newTasks.push({
                ...newTask,
                id: Math.random().toString(36).substring(7),
                title: `${newTask.title} ${dayName}`,
                dueDate: date.toISOString()
              });
            }
            setTasks(prev => [...newTasks, ...prev]);
          } else {
            setTasks(prev => [newTask, ...prev]);
          }
        }} darkMode={isDarkMode} />;
      default:
        return <Dashboard tasks={tasks} user={user} setView={setCurrentView} onPassTask={handlePassTask} onCompleteDuty={(id) => handleCompleteTask(id)} isDarkMode={isDarkMode} />;
    }
  };

  return (
    <div className={`max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} shadow-2xl`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Navigation */}
      {isLoggedIn && (
        <nav className={`sticky bottom-0 border-t-2 px-6 py-3 flex justify-between items-center z-50 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <NavItem 
            icon={<Home />} 
            label="Inicio" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')} 
            darkMode={isDarkMode}
          />
          <NavItem 
            icon={<BarChart2 />} 
            label="Stats" 
            active={currentView === 'admin'} 
            onClick={() => setCurrentView('admin')} 
            darkMode={isDarkMode}
          />
          <div className="relative -top-6">
            <button 
              onClick={() => setCurrentView('create-task')}
              className="size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 flex items-center justify-center border-4 border-white dark:border-slate-800"
            >
              <Plus size={32} />
            </button>
          </div>
          <NavItem 
            icon={<Trophy />} 
            label="Liga" 
            active={currentView === 'ranking'} 
            onClick={() => setCurrentView('ranking')} 
            darkMode={isDarkMode}
          />
          <NavItem 
            icon={<MessageCircle />} 
            label="Chat" 
            active={currentView === 'chat'} 
            onClick={() => setCurrentView('chat')} 
            darkMode={isDarkMode}
          />
          <NavItem 
            icon={<User />} 
            label="Perfil" 
            active={currentView === 'profile'} 
            onClick={() => setCurrentView('profile')} 
            darkMode={isDarkMode}
          />
        </nav>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, darkMode }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, darkMode?: boolean, key?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-primary' : (darkMode ? 'text-slate-500' : 'text-slate-400')}`}
    >
      <div className={`p-1 rounded-xl ${active ? 'bg-primary/10' : ''}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24, fill: active ? 'currentColor' : 'none' })}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function ZoomableImage({ src, alt, className }: { src: string, alt: string, className?: string }) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <motion.img
        src={src}
        alt={alt}
        className={`${className} cursor-zoom-in`}
        onClick={() => setIsZoomed(true)}
        whileHover={{ scale: 1.02 }}
        referrerPolicy="no-referrer"
      />
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={src}
              alt={alt}
              className="max-w-full max-h-full rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <button 
              className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
              onClick={() => setIsZoomed(false)}
            >
              <X size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  darkMode = false
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string, 
  confirmText?: string, 
  cancelText?: string,
  darkMode?: boolean
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`relative w-full max-w-xs rounded-3xl p-6 shadow-2xl border-2 transition-colors duration-300 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-900'}`}
          >
            <div className="text-center space-y-4">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <Shield size={32} />
              </div>
              <h3 className="text-xl font-black">{title}</h3>
              <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{message}</p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={onConfirm}
                  className="w-full py-3 rounded-xl bg-primary text-white font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                  {confirmText}
                </button>
                <button
                  onClick={onClose}
                  className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- Views ---

function Dashboard({ tasks, user, setView, onPassTask, onCompleteDuty, isDarkMode }: { tasks: Task[], user: Member, setView: (v: View) => void, onPassTask: (t: Task) => void, onCompleteDuty: (id: string) => void, isDarkMode: boolean }) {
  const [sortBy, setSortBy] = useState<'xp' | 'dueDate' | 'category'>('dueDate');

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'xp') return b.xp - a.xp;
    if (sortBy === 'category') return a.category.localeCompare(b.category);
    if (sortBy === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dateA - dateB;
    }
    return 0;
  });

  const completedDuties = tasks.filter(t => t.taskType === 'duty' && (t.status === 'completed' || t.status === 'validated')).length;
  const totalDuties = tasks.filter(t => t.taskType === 'duty').length;
  const completedObligations = tasks.filter(t => t.taskType === 'obligation' && (t.status === 'completed' || t.status === 'validated')).length;
  const totalObligations = tasks.filter(t => t.taskType === 'obligation').length;

  const dutyProgress = totalDuties > 0 ? (completedDuties / totalDuties) * 100 : 0;
  const obligationProgress = totalObligations > 0 ? (completedObligations / totalObligations) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col">
      <header className={`p-4 border-b-2 flex justify-between items-center sticky top-0 z-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/20 border-2 border-primary/30 overflow-hidden">
            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">¡Hola, {user.name}!</h1>
            <p className="text-primary font-bold text-sm">Nivel {user.level} • Explorador</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Heart className="text-red-500 fill-red-500" size={20} />
            <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{user.hearts}</span>
          </div>
          <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-lg">
            <Flame className="text-orange-500 fill-orange-500" size={20} />
            <span className="font-bold text-orange-600">{user.streak}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 overflow-y-auto">
        <section className="grid grid-cols-2 gap-4">
          <div className={`rounded-xl p-4 border-2 duo-shadow transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">XP Total</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="text-primary fill-primary" size={20} />
              <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{user.xp}</span>
            </div>
          </div>
          <div className={`rounded-xl p-4 border-2 duo-shadow transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Racha Semanal</p>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="text-orange-500" size={20} />
              <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{user.streak}/14</span>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl p-5 border-2 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className={`font-bold text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Progreso Visual</h3>
              <p className="text-slate-500 text-sm italic">¡Sigue así, vas mejorando!</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                <span className="text-slate-500">Deberes Diarios</span>
                <span className="text-primary">{completedDuties}/{totalDuties}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${dutyProgress}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                <span className="text-slate-500">Obligaciones (Con Foto)</span>
                <span className="text-amber-500">{completedObligations}/{totalObligations}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${obligationProgress}%` }}></div>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl p-5 border-2 duo-shadow cursor-pointer transition-colors duration-300 ${user.debt < 0 ? (isDarkMode ? 'bg-red-900/20 border-red-900/40 hover:bg-red-900/30' : 'bg-red-50 border-red-100 hover:bg-red-100') : (isDarkMode ? 'bg-emerald-900/20 border-emerald-900/40 hover:bg-emerald-900/30' : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100')}`} onClick={() => setView('settlement')}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={user.debt < 0 ? "text-red-500" : "text-emerald-500"} size={20} />
              <h3 className={`font-bold ${user.debt < 0 ? (isDarkMode ? 'text-red-400' : 'text-red-700') : (isDarkMode ? 'text-emerald-400' : 'text-emerald-700')}`}>Deuda Semanal</h3>
            </div>
            <span className={`${user.debt < 0 ? 'text-red-600' : 'text-emerald-600'} font-black`}>${user.debt.toLocaleString()} COP</span>
          </div>
          <p className={`${user.debt < 0 ? 'text-red-500' : 'text-emerald-500'} text-xs font-medium`}>
            {user.debt < 0 ? 'Tienes una deuda pendiente que requiere liquidación.' : '¡Felicidades! Tienes saldo a favor para invitar a comer.'}
          </p>
          <div className={`mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${user.debt < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            <span>Ver detalles</span>
            <ChevronRight size={14} />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Misiones de Hoy</h2>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border-2 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <ArrowUpDown size={14} className="text-slate-400" />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`text-xs font-bold bg-transparent border-none outline-none cursor-pointer ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                >
                  <option value="dueDate">Fecha</option>
                  <option value="xp">XP</option>
                  <option value="category">Categoría</option>
                </select>
              </div>
              <button onClick={() => setView('voting')} className="text-primary font-bold text-sm">Ver todas</button>
            </div>
          </div>
          <div className="space-y-3">
            {sortedTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onPass={() => onPassTask(task)} 
                onComplete={() => onCompleteDuty(task.id)}
                darkMode={isDarkMode}
              />
            ))}
          </div>
        </section>

        <section className="flex items-center gap-4 py-4 cursor-pointer" onClick={() => setView('invitation')}>
          <div className="relative">
            <div className="bg-primary/20 p-2 rounded-full border-2 border-primary/40">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=FamilyBot" alt="Mascot" className="size-16" />
            </div>
          </div>
          <div className={`flex-1 p-4 rounded-2xl rounded-tl-none border-2 relative duo-shadow transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-100 text-slate-700'}`}>
            <p className="font-medium text-sm">
              "¡Vas por muy buen camino! Completa 2 misiones más para asegurar tu racha."
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function TaskItem({ task, onPass, onComplete, darkMode }: { task: Task, onPass: () => void, onComplete: () => void, darkMode?: boolean, key?: string }) {
  const Icon = IconMap[task.icon] || Utensils;
  const isCompleted = task.status === 'validated' || task.status === 'completed';
  const isPendingValidation = task.status === 'completed';

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl border-2 duo-shadow transition-all duration-300 ${isCompleted ? (darkMode ? 'bg-slate-800/50 border-slate-700 opacity-60' : 'bg-slate-50 border-slate-100 opacity-60') : (darkMode ? 'bg-slate-800 border-slate-700 hover:translate-y-[-2px]' : 'bg-white border-slate-100 hover:translate-y-[-2px]')}`}>
      <div className="flex items-center gap-4">
        <div className={`size-14 rounded-xl flex items-center justify-center relative ${isCompleted ? 'bg-slate-200 dark:bg-slate-700' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
          <Icon className={isCompleted ? 'text-slate-500' : 'text-blue-600 dark:text-blue-400'} size={32} />
          {isCompleted && (
            <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full size-5 flex items-center justify-center">
              {isPendingValidation ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} strokeWidth={4} />}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">{task.category}</span>
            {task.dueDate && !isCompleted && (
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <h4 className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'} ${isCompleted ? 'line-through' : ''}`}>{task.title}</h4>
          <p className="text-slate-500 text-sm">{isPendingValidation ? 'Esperando validación...' : task.description}</p>
        </div>
        <div className="text-center">
          <span className={`block font-black ${isCompleted ? 'text-slate-400' : 'text-primary'}`}>+{task.xp}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">XP</span>
        </div>
      </div>
      
      {!isCompleted && (
        <div className="flex gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button 
            onClick={onComplete}
            className="flex-[2] py-2 px-3 rounded-lg bg-primary text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            {task.taskType === 'obligation' ? <Camera size={14} /> : <CheckCircle2 size={14} />}
            {task.taskType === 'obligation' ? 'Realizar Tarea' : 'Cumplido'}
          </button>
          <button 
            onClick={onPass}
            className="flex-1 py-2 px-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          >
            Pasar (${task.fine.toLocaleString()})
          </button>
        </div>
      )}
    </div>
  );
}

// --- Other View Placeholders ---

function LoginScreen({ onLogin, darkMode }: { onLogin: (email: string, pass: string) => void, darkMode: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
      <div className="text-center space-y-2">
        <div className="size-20 bg-primary rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-primary/30 mb-4">
          <Shield size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Family Quest</h1>
        <p className="text-slate-500 font-medium">Inicia sesión para continuar</p>
      </div>

      <div className="w-full space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">Correo Electrónico</label>
          <div className="relative">
            <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@familia.com"
              className={`w-full p-4 pl-12 rounded-2xl border-2 outline-none focus:border-primary transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">Contraseña</label>
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full p-4 pl-12 rounded-2xl border-2 outline-none focus:border-primary transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
            />
          </div>
        </div>

        <button 
          onClick={() => onLogin(email, password)}
          className="w-full py-4 bg-primary text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          Entrar <ChevronRight size={20} />
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-slate-400">¿Olvidaste tu contraseña? Contacta al administrador.</p>
      </div>
    </div>
  );
}

function AdminDashboard({ members, payments, onApprovePayment, onRejectPayment, onCreateUser, onUpdateUser, onValidateTask, onStartVoting, onAssignTask, onDeleteTask, onAddAlert, setView, tasks, currentUser, paymentConfig, onUpdatePaymentConfig }: { 
  members: Member[], 
  payments: Payment[],
  tasks: Task[],
  onApprovePayment: (id: string) => void,
  onRejectPayment: (id: string) => void,
  onCreateUser: (m: Member) => void,
  onUpdateUser: (m: Member) => void,
  onValidateTask: (taskId: string, approved: boolean, customDebtChange?: number) => void,
  onStartVoting?: (taskId: string) => void,
  onAssignTask: (taskId: string, userId: string) => void,
  onDeleteTask: (taskId: string) => void,
  onAddAlert: (a: Alert) => void,
  setView: (v: View) => void,
  currentUser: Member,
  paymentConfig: { type: 'nequi' | 'bancolombia', number: string, owner: string },
  onUpdatePaymentConfig: (config: { type: 'nequi' | 'bancolombia', number: string, owner: string }) => void
}) {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'tasks' | 'payments' | 'assign' | 'alerts' | 'calendar' | 'config'>('stats');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<Member | null>(null);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<string | null>(null);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<string | null>(null);
  
  // Alert Form State
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'duty' | 'task' | 'general'>('general');
  
  // Create/Edit User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');
  const [newUserDebt, setNewUserDebt] = useState(0);

  // Payment Config Form State
  const [editPaymentNumber, setEditPaymentNumber] = useState(paymentConfig.number);
  const [editPaymentType, setEditPaymentType] = useState(paymentConfig.type);
  const [editPaymentOwner, setEditPaymentOwner] = useState(paymentConfig.owner);

  const totalDebt = members.reduce((acc, m) => acc + m.debt, 0);
  const adminDebt = members.find(m => m.id === currentUser.id)?.debt || 0;

  const handleCreateUser = () => {
    if (!newUserName || !newUserEmail || !newUserPass) return;
    
    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRole,
        debt: newUserDebt
      });
      setEditingUser(null);
    } else {
      const newUser: Member = {
        id: Math.random().toString(36).substring(7),
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRole,
        level: 1,
        xp: 0,
        hearts: 5,
        streak: 0,
        debt: newUserDebt || -50000,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUserName}`,
        progress: 0,
        settings: { darkMode: false }
      };
      onCreateUser(newUser);
    }
    
    setShowCreateUser(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPass('');
    setNewUserDebt(0);
  };

  const startEditing = (member: Member) => {
    setEditingUser(member);
    setNewUserName(member.name);
    setNewUserEmail(member.email);
    setNewUserPass(member.password || '');
    setNewUserRole(member.role);
    setNewUserDebt(member.debt);
    setShowCreateUser(true);
  };

  const handleAssignTask = () => {
    if (selectedTaskForAssign && selectedUserForAssign) {
      onAssignTask(selectedTaskForAssign, selectedUserForAssign);
      setSelectedTaskForAssign(null);
      setSelectedUserForAssign(null);
      setActiveTab('stats');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="p-6 pb-2">
        <h1 className="text-2xl font-black tracking-tight">Panel de Control</h1>
        <p className="text-slate-500 font-medium">Gestión de la familia</p>
      </header>

      <div className="px-6 flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('stats')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Stats
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Usuarios
        </button>
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'tasks' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Tareas
        </button>
        <button 
          onClick={() => setActiveTab('assign')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'assign' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Asignar
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'payments' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Pagos
        </button>
        <button 
          onClick={() => setActiveTab('alerts')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'alerts' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Alertas
        </button>
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'calendar' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Calendario
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'config' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Config
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-20">
        {activeTab === 'stats' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/30">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Tareas Listas</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border-2 border-amber-100 dark:border-amber-900/30">
                <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Deuda Total Familia</p>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400">
                  ${totalDebt.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-2 border-blue-100 dark:border-blue-900/30 col-span-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Mi Deuda Actual</p>
                    <p className="text-2xl font-black text-blue-700 dark:text-blue-400">
                      ${adminDebt.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-blue-500 uppercase">Estado Semanal</p>
                    <p className={`text-xs font-black ${adminDebt < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {adminDebt < 0 ? 'En Deuda' : 'Saldo a Favor'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Validar Tareas</h3>
              {tasks.filter(t => t.status === 'completed').length === 0 ? (
                <p className="text-center py-4 text-slate-400 text-sm font-medium">No hay tareas para validar</p>
              ) : (
                tasks.filter(t => t.status === 'completed').map(task => (
                  <div key={task.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {React.createElement(IconMap[task.icon] || Utensils, { size: 20 })}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{task.title}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black">
                          Asignado a: {members.find(m => m.id === task.assignedTo)?.name || 'Todos'}
                        </p>
                      </div>
                    </div>
                    {task.imageUrl && (
                      <ZoomableImage src={task.imageUrl} alt="Proof" className="w-full h-40 object-cover rounded-xl" />
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onValidateTask(task.id, true)}
                        className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs"
                      >
                        Aprobar (+${task.value?.toLocaleString()})
                      </button>
                      <button 
                        onClick={() => onValidateTask(task.id, false)}
                        className="flex-1 py-2 bg-rose-500 text-white rounded-lg font-bold text-xs"
                      >
                        Rechazar
                      </button>
                      {!task.isVotingActive && (
                        <button 
                          onClick={() => onStartVoting?.(task.id)}
                          className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                        >
                          <Gavel size={12} /> Votar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Gestionar Tareas</h3>
              <button 
                onClick={() => setView('create-task')}
                className="p-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 flex items-center gap-2 px-4"
              >
                <Plus size={20} /> <span className="text-xs font-bold uppercase">Nueva</span>
              </button>
            </div>

            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                  <div className={`size-12 rounded-xl flex items-center justify-center ${task.taskType === 'obligation' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    {React.createElement(IconMap[task.icon] || Utensils, { size: 24 })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{task.title}</p>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${task.taskType === 'obligation' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        {task.taskType === 'obligation' ? 'Obligación' : 'Deber'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      ${task.value?.toLocaleString()} • {task.xp} XP
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('¿Eliminar esta tarea?')) {
                        onDeleteTask(task.id);
                      }
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Miembros</h3>
              <button 
                onClick={() => setShowCreateUser(true)}
                className="p-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20"
              >
                <Plus size={20} />
              </button>
            </div>

            {showCreateUser && (
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary/20 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h4>
                  <button onClick={() => { setShowCreateUser(false); setEditingUser(null); }}><X size={20} /></button>
                </div>
                <input 
                  type="text" 
                  placeholder="Nombre" 
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none"
                />
                <input 
                  type="email" 
                  placeholder="Correo" 
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none"
                />
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none"
                />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deuda Semanal (Negativo = Debe)</label>
                  <input 
                    type="number" 
                    placeholder="Deuda" 
                    value={newUserDebt}
                    onChange={(e) => setNewUserDebt(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none"
                  />
                </div>
                <select 
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'member')}
                  className="w-full p-3 rounded-xl border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none"
                >
                  <option value="member">Miembro</option>
                  <option value="admin">Administrador</option>
                </select>
                <button 
                  onClick={handleCreateUser}
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            )}

            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <img src={member.avatar} alt={member.name} className="size-10 rounded-full border-2 border-white shadow-sm" />
                  <div>
                    <p className="font-bold text-sm">{member.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      {member.role} • <span className={member.debt < 0 ? 'text-rose-500' : 'text-emerald-500'}>${member.debt.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => startEditing(member)}
                    className="p-2 text-slate-400 hover:text-primary transition-all"
                  >
                    <Wrench size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedUserForAssign(member.id);
                      setActiveTab('assign');
                    }}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'assign' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">1. Selecciona Tarea</h3>
              <div className="grid grid-cols-1 gap-2">
                {tasks.map(task => (
                  <button 
                    key={task.id}
                    onClick={() => setSelectedTaskForAssign(task.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${selectedTaskForAssign === task.id ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}`}
                  >
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {React.createElement(IconMap[task.icon] || Utensils, { size: 20 })}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{task.title}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black">{task.category}</p>
                    </div>
                    {selectedTaskForAssign === task.id && <CheckCircle2 size={20} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">2. Selecciona Miembro</h3>
              <div className="grid grid-cols-2 gap-2">
                {members.map(member => (
                  <button 
                    key={member.id}
                    onClick={() => setSelectedUserForAssign(member.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${selectedUserForAssign === member.id ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}`}
                  >
                    <img src={member.avatar} alt={member.name} className="size-12 rounded-full border-2 border-white shadow-sm" />
                    <p className="font-bold text-sm">{member.name}</p>
                    {selectedUserForAssign === member.id && <CheckCircle2 size={16} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={!selectedTaskForAssign || !selectedUserForAssign}
              onClick={handleAssignTask}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-wider shadow-lg transition-all ${selectedTaskForAssign && selectedUserForAssign ? 'bg-primary text-white shadow-primary/30' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              Asignar Tarea
            </button>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Aprobar Pagos</h3>
            {payments.filter(p => p.status === 'pending').length === 0 ? (
              <div className="text-center py-10">
                <CreditCard size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 font-medium">No hay pagos pendientes</p>
              </div>
            ) : (
              payments.filter(p => p.status === 'pending').map(payment => (
                <div key={payment.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{payment.userName}</p>
                      <p className="text-xs text-slate-500">Pago de {payment.type === 'fine' ? 'Multa' : 'Suscripción'}</p>
                    </div>
                    <p className="font-black text-primary">${payment.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onApprovePayment(payment.id)}
                      className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-500/20"
                    >
                      Aprobar
                    </button>
                    <button 
                      onClick={() => onRejectPayment(payment.id)}
                      className="flex-1 py-2 bg-rose-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-rose-500/20"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))
            )}
            
            {payments.filter(p => p.status !== 'pending').length > 0 && (
              <>
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 pt-4">Historial</h3>
                {payments.filter(p => p.status !== 'pending').map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl opacity-60">
                    <div>
                      <p className="font-bold text-sm">{payment.userName}</p>
                      <p className="text-xs text-slate-500">${payment.amount.toLocaleString()}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${payment.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {payment.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary/20 space-y-4 shadow-xl">
              <h4 className="font-bold">Nueva Alerta</h4>
              <input 
                type="text" 
                placeholder="Título de la alerta" 
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                className="w-full p-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700"
              />
              <textarea 
                placeholder="Mensaje de la alerta" 
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                className="w-full p-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 h-24 resize-none"
              />
              <select 
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as any)}
                className="w-full p-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700"
              >
                <option value="general">General</option>
                <option value="duty">Deber por cumplir</option>
                <option value="task">Tarea pendiente</option>
              </select>
              <button 
                onClick={() => {
                  if (!alertTitle || !alertMessage) return;
                  onAddAlert({
                    id: Math.random().toString(36).substring(7),
                    title: alertTitle,
                    message: alertMessage,
                    type: alertType,
                    date: new Date().toISOString(),
                    createdBy: 'Admin'
                  });
                  setAlertTitle('');
                  setAlertMessage('');
                  alert('Alerta creada con éxito');
                }}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl"
              >
                Crear Alerta
              </button>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6 pb-10">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Disponibilidad Familiar</h3>
            {members.map(member => (
              <div key={member.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={member.avatar} alt={member.name} className="size-8 rounded-full" />
                  <p className="font-bold">{member.name}</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                    <div key={day} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500">{day}</span>
                      <div className="flex gap-1">
                        {member.availability?.[day]?.length ? (
                          member.availability[day].map(slot => (
                            <span key={slot} className="px-2 py-1 bg-primary/10 text-primary rounded-md font-bold">
                              {slot}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-300 italic">No disponible</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6 pb-10">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-100 dark:border-slate-700 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <CreditCard size={20} />
                </div>
                <h3 className="font-black text-lg">Cuenta de Cobro</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Plataforma</label>
                  <select 
                    value={editPaymentType}
                    onChange={(e) => setEditPaymentType(e.target.value as 'nequi' | 'bancolombia')}
                    className="w-full p-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 font-bold"
                  >
                    <option value="nequi">Nequi</option>
                    <option value="bancolombia">Bancolombia</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Número de Cuenta</label>
                  <input 
                    type="text" 
                    value={editPaymentNumber}
                    onChange={(e) => setEditPaymentNumber(e.target.value)}
                    placeholder="3024468046"
                    className="w-full p-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Titular</label>
                  <input 
                    type="text" 
                    value={editPaymentOwner}
                    onChange={(e) => setEditPaymentOwner(e.target.value)}
                    placeholder="Nombre del titular"
                    className="w-full p-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 font-bold"
                  />
                </div>

                <button 
                  onClick={() => {
                    onUpdatePaymentConfig({
                      type: editPaymentType,
                      number: editPaymentNumber,
                      owner: editPaymentOwner
                    });
                    alert('Configuración de pago actualizada');
                  }}
                  className="w-full py-4 bg-primary text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>

            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border-2 border-amber-100 dark:border-amber-900/20">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-amber-500" size={20} />
                <h3 className="font-black text-amber-800 dark:text-amber-400">Información Importante</h3>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-500 leading-relaxed font-medium">
                Esta cuenta será la que se muestre a todos los usuarios en la pantalla de liquidación semanal para realizar sus pagos por tareas no ejecutadas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboardOld({ members, setView }: { members: Member[], setView: (v: View) => void }) {
  return null;
}

function UploadEvidence({ task, setView, onComplete }: { task: Task | null, setView: (v: View) => void, onComplete: (proof: string) => void }) {
  const [captured, setCaptured] = useState(false);

  return (
    <div className="flex-1 flex flex-col p-4 space-y-6">
      <header className="flex items-center gap-2">
        <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
        <h1 className="text-lg font-bold">Evidencia de Tarea</h1>
      </header>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
        <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
          {task && React.createElement(IconMap[task.icon] || Utensils, { className: "text-primary", size: 32 })}
        </div>
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest">Tarea Seleccionada</p>
          <h2 className="text-xl font-bold">{task?.title || 'Sin tarea'}</h2>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        {captured ? (
          <div className="w-full space-y-6">
            <div className="aspect-square w-full rounded-2xl overflow-hidden border-4 border-primary shadow-xl">
              <img src="https://picsum.photos/seed/task-proof/800/800" className="w-full h-full object-cover" alt="Proof" />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setCaptured(false)}
                className="flex-1 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400"
              >
                Repetir
              </button>
              <button 
                onClick={() => onComplete('https://picsum.photos/seed/task-proof/800/800')}
                className="flex-[2] py-4 rounded-xl bg-primary text-white font-black uppercase tracking-wider shadow-lg shadow-primary/30"
              >
                Enviar Prueba
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-center">Sube tu prueba para +{task?.xp || 0} XP</h3>
            <button 
              onClick={() => setCaptured(true)}
              className="size-48 rounded-full bg-primary text-white shadow-xl shadow-primary/30 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <Camera size={48} />
              <span className="font-bold">Capturar</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AlertScreen({ alerts, setView, user, onAddAlert }: { alerts: Alert[], setView: (v: View) => void, user: Member, onAddAlert: (a: Alert) => void }) {
  const isDarkMode = user.settings?.darkMode;

  return (
    <div className="flex-1 flex flex-col">
      <header className={`p-4 border-b-2 flex items-center justify-between transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
          <h1 className="font-bold text-lg">Alertas Familiares</h1>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-4 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <AlertTriangle size={40} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-500">No hay alertas activas</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className={`p-5 rounded-2xl border-2 duo-shadow transition-all ${alert.type === 'duty' ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30' : alert.type === 'task' ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`size-8 rounded-lg flex items-center justify-center ${alert.type === 'duty' ? 'bg-orange-100 text-orange-600' : alert.type === 'task' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    {alert.type === 'duty' ? <Shield size={18} /> : alert.type === 'task' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  </div>
                  <h3 className={`font-black ${alert.type === 'duty' ? 'text-orange-700 dark:text-orange-400' : alert.type === 'task' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{alert.title}</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(alert.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className={`text-sm font-medium ${alert.type === 'duty' ? 'text-orange-600/80 dark:text-orange-400/80' : alert.type === 'task' ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-slate-500'}`}>{alert.message}</p>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

function ChatScreen({ messages, user, setView, onSendMessage, onDeleteMessage }: { messages: ChatMessage[], user: Member, setView: (v: View) => void, onSendMessage: (m: ChatMessage) => void, onDeleteMessage: (id: string) => void }) {
  const [inputText, setInputText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const isDarkMode = user.settings?.darkMode;

  const handleSend = () => {
    if (!inputText && !image) return;
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      text: inputText,
      imageUrl: image || undefined,
      timestamp: new Date().toISOString(),
      isAdminAlert: user.role === 'admin' && inputText.startsWith('/alerta ')
    };
    if (newMessage.isAdminAlert) {
      newMessage.text = newMessage.text.replace('/alerta ', '');
    }
    onSendMessage(newMessage);
    setInputText('');
    setImage(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className={`p-4 border-b-2 flex items-center justify-between transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
          <h1 className="font-bold text-lg">Chat Familiar</h1>
        </div>
        {user.role === 'admin' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
            <Shield size={14} className="text-primary" />
            <span className="text-[10px] font-black text-primary uppercase">Admin Mode</span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.userId === user.id ? 'flex-row-reverse' : ''}`}>
            <img src={msg.userAvatar} className="size-8 rounded-full border-2 border-white shadow-sm self-end" alt={msg.userName} />
            <div className={`max-w-[80%] space-y-1 ${msg.userId === user.id ? 'items-end' : ''}`}>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold text-slate-400">{msg.userName}</span>
                <span className="text-[10px] text-slate-300">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`p-3 rounded-2xl relative group ${msg.isAdminAlert ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : (msg.userId === user.id ? 'bg-primary text-white' : (isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'))}`}>
                {msg.isAdminAlert && <div className="flex items-center gap-1 mb-1 opacity-80"><AlertTriangle size={12} /> <span className="text-[10px] font-black uppercase tracking-widest">Alerta Admin</span></div>}
                {msg.imageUrl && <ZoomableImage src={msg.imageUrl} className="rounded-xl mb-2 w-full max-h-48 object-cover" alt="Chat image" />}
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                
                {user.role === 'admin' && (
                  <button 
                    onClick={() => onDeleteMessage(msg.id)}
                    className="absolute -top-2 -right-2 size-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`p-4 border-t-2 space-y-3 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        {image && (
          <div className="relative size-20 rounded-xl overflow-hidden border-2 border-primary">
            <img src={image} className="w-full h-full object-cover" alt="Preview" />
            <button onClick={() => setImage(null)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><X size={12} /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setImage('https://picsum.photos/seed/chat/800/800')}
            className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
          >
            <Camera size={20} />
          </button>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={user.role === 'admin' ? "Escribe o usa /alerta..." : "Escribe un mensaje..."}
            className={`flex-1 p-3 rounded-xl border-2 outline-none focus:border-primary transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
          />
          <button 
            onClick={handleSend}
            className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function VotingScreen({ setView, tasks, members, user, onCastVote }: { setView: (v: View) => void, tasks: Task[], members: Member[], user: Member, onCastVote: (taskId: string, userId: string, vote: 'good' | 'bad') => void }) {
  const activeVotingTasks = tasks.filter(t => t.isVotingActive);

  return (
    <div className="flex-1 flex flex-col">
      <header className="p-6 pb-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Votaciones</h1>
          <p className="text-slate-500 font-medium">Evalúa el desempeño de la familia</p>
        </div>
        <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeVotingTasks.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <Gavel size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="font-bold">No hay votaciones activas</p>
          </div>
        ) : (
          activeVotingTasks.map(task => {
            const isAssignedToMe = task.assignedTo === user.id;
            const myVote = task.votes?.find(v => v.userId === user.id)?.vote;
            const badVotes = task.votes?.filter(v => v.vote === 'bad').length || 0;
            const goodVotes = task.votes?.filter(v => v.vote === 'good').length || 0;

            return (
              <div key={task.id} className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl p-5 space-y-4 duo-shadow">
                <div className="flex items-center gap-3">
                  <img src={members.find(m => m.id === task.assignedTo)?.avatar} className="size-12 rounded-full border-2 border-primary" alt="User" />
                  <div>
                    <p className="font-black">{members.find(m => m.id === task.assignedTo)?.name || 'Usuario'}</p>
                    <p className="text-xs font-bold text-primary uppercase">{task.title}</p>
                  </div>
                </div>
                
                {task.imageUrl && (
                  <div className="aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-700">
                    <ZoomableImage src={task.imageUrl} alt="Evidence" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Estado de la Tarea</p>
                  <p className="text-sm font-medium italic">¿Se realizó de manera adecuada?</p>
                </div>

                {isAssignedToMe ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-100 dark:border-amber-900/30 text-center">
                    <p className="text-xs font-bold text-amber-600 uppercase">No puedes votar en tu propia tarea</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => onCastVote(task.id, user.id, 'bad')}
                      className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all flex flex-col items-center ${myVote === 'bad' ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-100 dark:border-slate-700 text-rose-500'}`}
                    >
                      <span className="text-xs uppercase">Mal Hecho</span>
                      <span className="text-lg">{badVotes}</span>
                    </button>
                    <button 
                      onClick={() => onCastVote(task.id, user.id, 'good')}
                      className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all flex flex-col items-center ${myVote === 'good' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-primary text-white border-primary shadow-lg shadow-primary/20'}`}
                    >
                      <span className="text-xs uppercase">Bien Hecho</span>
                      <span className="text-lg">{goodVotes}</span>
                    </button>
                  </div>
                )}
                
                {user.role === 'admin' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 text-center">Acción de Administrador</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (confirm('¿Cerrar votación y penalizar por mayoría?')) {
                            // Logic in handleValidateTask will handle the penalty if badVotes > goodVotes
                            // We call it with false to trigger the penalty check
                            // Wait, handleValidateTask needs to know if it's a rejection based on voting
                          }
                        }}
                        className="hidden"
                      >
                        Finalizar
                      </button>
                      <p className="text-[10px] text-center w-full text-slate-400 italic">Ve al Panel Admin para finalizar y validar según los votos.</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RankingScreen({ setView }: { setView: (v: View) => void }) {
  const [activeTab, setActiveTab] = useState<'league' | 'streak'>('league');
  
  return (
    <div className="flex-1 flex flex-col">
      <header className="p-6 pb-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Liga Familiar</h1>
          <p className="text-slate-500 font-medium">Compite y gana beneficios</p>
        </div>
        <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
      </header>

      <div className="px-6 flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('league')}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'league' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Clasificación
        </button>
        <button 
          onClick={() => setActiveTab('streak')}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'streak' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Beneficios Racha
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        {activeTab === 'league' ? (
          <div className="space-y-4">
            {[
              { name: 'Kevin', xp: 1250, rank: 1, avatar: 'Kevin' },
              { name: 'Jefa', xp: 1100, rank: 2, avatar: 'Jefa' },
              { name: 'Styven', xp: 850, rank: 3, avatar: 'Styven' },
              { name: 'Isabella', xp: 720, rank: 4, avatar: 'Isabella' },
            ].map((user, i) => (
              <div key={user.name} className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${i === 0 ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/30' : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
                <div className={`size-8 rounded-full flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
                  {user.rank}
                </div>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`} alt={user.name} className="size-10 rounded-full border-2 border-white" />
                <div className="flex-1">
                  <p className="font-bold">{user.name}</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{user.xp} XP</p>
                </div>
                {i === 0 && <Trophy className="text-amber-500" size={24} />}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-orange-500 to-rose-500 rounded-3xl text-white space-y-4 shadow-xl shadow-orange-500/20">
              <div className="flex items-center gap-3">
                <Flame size={32} className="fill-white" />
                <h3 className="text-xl font-black uppercase tracking-wider">Beneficios de Racha</h3>
              </div>
              <p className="text-sm font-medium opacity-90">Mantén tu racha activa para desbloquear recompensas exclusivas y descuentos en tus multas.</p>
              <div className="pt-2">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2">
                  <span>Tu Racha Actual</span>
                  <span>5 Días</span>
                </div>
                <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                  <div className="bg-white h-full rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Niveles de Recompensa</h4>
              <div className="space-y-3">
                {[
                  { days: '7 Días', title: 'Descuento del 10%', desc: 'Todas tus multas por pasar tareas se reducen un 10%.', icon: <Percent size={18} /> },
                  { days: '14 Días', title: 'Descuento del 25%', desc: 'Todas tus multas por pasar tareas se reducen un 25%.', icon: <Percent size={18} /> },
                  { days: '21 Días', title: 'Liberación Total', desc: 'Un día libre de obligaciones a la semana (tú eliges el día).', icon: <Zap size={18} /> },
                  { days: '30 Días', title: 'Intercambio Canino', desc: 'Cambia cualquier deber por sacar al perro 3 veces (Mañana, Tarde, Noche).', icon: <Dog size={18} /> },
                ].map((benefit, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent hover:border-primary/20 transition-all">
                    <div className="size-12 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-primary shadow-sm">
                      {benefit.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm">{benefit.title}</p>
                        <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">{benefit.days}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettlementScreen({ setView, user, tasks, paymentConfig, isDarkMode }: { setView: (v: View) => void, user: Member, tasks: Task[], paymentConfig: { type: 'nequi' | 'bancolombia', number: string, owner: string }, isDarkMode: boolean }) {
  const [step, setStep] = useState<'summary' | 'payment' | 'success'>('summary');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Calculate today's debt (failed tasks today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysFailedTasks = tasks.filter(t => 
    t.assignedTo === user.id && 
    t.status === 'failed' && 
    t.completedAt && 
    new Date(t.completedAt) >= todayStart
  );
  const todaysDebt = todaysFailedTasks.reduce((acc, t) => acc + (t.fine * (t.penaltyMultiplier || 1)), 0);

  if (step === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="size-24 rounded-full bg-primary/20 flex items-center justify-center text-primary">
          <Check size={48} strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-black">¡Comprobante Enviado!</h1>
        <p className="text-slate-500">El administrador verificará tu pago pronto. Tu deuda se borrará una vez confirmada.</p>
        <button 
          onClick={() => setView('dashboard')}
          className="w-full bg-primary text-white font-black py-4 rounded-xl duo-shadow uppercase"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className={`p-4 space-y-6 flex-1 flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        <header className="flex items-center gap-4">
          <button onClick={() => setStep('summary')} className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X /></button>
          <h1 className="text-lg font-black">Realizar Pago</h1>
        </header>

        <div className={`border-2 rounded-2xl p-6 space-y-4 shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enviar a {paymentConfig.type === 'nequi' ? 'Nequi' : 'Bancolombia'}</p>
            <p className="text-3xl font-black text-primary mt-1">{paymentConfig.number}</p>
            <p className="text-xs font-bold text-slate-500 mt-1">Titular: {paymentConfig.owner}</p>
          </div>
          <div className="flex justify-center">
            <button 
              className={`flex items-center gap-2 px-4 py-2 border-2 rounded-xl text-sm font-bold transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-100 text-slate-600'}`}
              onClick={() => {
                navigator.clipboard.writeText(paymentConfig.number);
                alert('Número copiado');
              }}
            >
              <Plus size={16} className="rotate-45" /> Copiar número
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col space-y-4">
          <h3 className="font-bold text-slate-800">Adjuntar Comprobante</h3>
          <div 
            className={`flex-1 border-4 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-colors ${receipt ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50'}`}
            onClick={() => setReceipt('https://picsum.photos/seed/receipt/400/600')}
          >
            {receipt ? (
              <div className="relative w-full h-full">
                <img src={receipt} className="w-full h-full object-cover rounded-xl" alt="Receipt" />
                <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={48} />
                </div>
              </div>
            ) : (
              <>
                <Camera size={48} className="text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400 text-center">Toca para tomar foto del comprobante</p>
              </>
            )}
          </div>
        </div>

        <button 
          disabled={!receipt}
          onClick={() => setIsConfirmModalOpen(true)}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-wide transition-all ${receipt ? 'bg-primary text-white duo-shadow' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          Enviar para Verificación
        </button>

        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={() => {
            setIsConfirmModalOpen(false);
            setStep('success');
          }}
          title="¿Enviar comprobante?"
          message="Asegúrate de que la foto sea clara. El administrador revisará tu pago."
          confirmText="Sí, enviar"
          cancelText="Revisar de nuevo"
        />
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      <header className="text-center relative pt-2">
        <button onClick={() => setView('dashboard')} className={`absolute left-0 top-2 p-2 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X size={20} /></button>
        <h1 className="text-xl font-black tracking-tight">Liquidación Semanal</h1>
        <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Corte: Domingo 11:59 PM</p>
      </header>

      <div className="space-y-4">
        <div className={`rounded-3xl p-6 text-center border-2 duo-shadow ${user.debt < 0 ? 'bg-rose-500 border-rose-600 text-white' : 'bg-emerald-500 border-emerald-600 text-white'}`}>
          <p className="text-xs font-black uppercase tracking-widest opacity-80">Total Acumulado Semana</p>
          <p className="text-5xl font-black mt-1">${Math.abs(user.debt).toLocaleString()}</p>
          <p className="text-[10px] font-bold uppercase mt-2 opacity-70">
            {user.debt < 0 ? 'Monto pendiente de pago' : 'Saldo a tu favor'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-2xl border-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deuda Hoy</p>
            <p className={`text-lg font-black ${todaysDebt > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
              ${todaysDebt.toLocaleString()}
            </p>
          </div>
          <div className={`p-4 rounded-2xl border-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha</p>
            <p className="text-xs font-bold text-slate-500 leading-tight capitalize">
              {today}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Desglose de Cargos</h3>
          <span className="text-[10px] font-bold text-slate-400 italic">Se reinicia cada lunes</span>
        </div>
        
        <div className="space-y-2">
          {tasks.filter(t => t.assignedTo === user.id && t.status === 'failed').length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border-2 border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-400">¡Sin cargos pendientes esta semana!</p>
            </div>
          ) : (
            tasks.filter(t => t.assignedTo === user.id && t.status === 'failed').map(task => (
              <div key={task.id} className={`p-4 rounded-2xl border-2 flex justify-between items-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-500'}`}>
                    {React.createElement(IconMap[task.icon] || Trash2, { size: 20 })}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{task.title}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{task.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-rose-500`}>-${(task.fine * (task.penaltyMultiplier || 1)).toLocaleString()}</p>
                  {task.penaltyMultiplier && task.penaltyMultiplier > 1 && (
                    <p className="text-[8px] font-black text-rose-400 uppercase">Penalidad x{task.penaltyMultiplier}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {user.debt < 0 && (
        <div className="pt-4">
          <button 
            onClick={() => setStep('payment')}
            className="w-full bg-primary text-white font-black py-4 rounded-2xl duo-shadow uppercase tracking-wider text-sm hover:bg-primary/90 transition-all active:scale-95"
          >
            Liquidar Deuda Ahora
          </button>
          <p className="text-center text-[10px] font-bold text-slate-400 mt-4 px-6">
            Al liquidar, el administrador deberá confirmar el recibo para que tu balance vuelva a cero.
          </p>
        </div>
      )}
    </div>
  );
}

function InvitationScreen({ setView }: { setView: (v: View) => void }) {
  return (
    <div className="flex-1 p-6 flex flex-col items-center text-center space-y-6">
      <div className="w-full aspect-square rounded-2xl overflow-hidden duo-shadow border-4 border-white">
        <ZoomableImage src="https://picsum.photos/seed/family-dinner/800/800" alt="Family Dinner" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-3xl font-black">¡Es hora de invitar!</h1>
      <div className="bg-white rounded-2xl p-5 w-full border-2 border-slate-100">
        <p className="text-lg">Has fallado más de <span className="text-red-500 font-bold">4 tareas</span> esta semana...</p>
        <p className="font-black text-xl mt-2">¡Te toca pagar la cuenta!</p>
      </div>
      <button 
        onClick={() => setView('chat')}
        className="w-full bg-primary text-white font-black py-4 rounded-2xl text-lg uppercase duo-button-shadow"
      >
        ¡Lo prometo!
      </button>
    </div>
  );
}

function PassTaskScreen({ task, setView }: { task: Task | null, setView: (v: View) => void }) {
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'nequi' | 'efectivo'>('nequi');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  if (!task) return null;

  const otherMembers = MEMBERS.filter(m => m.id !== '3'); // Filter out current user (Leo)
  const penaltyMultiplier = task.penaltyMultiplier || 1;
  const finalFine = task.fine * penaltyMultiplier;

  if (step === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="size-24 rounded-full bg-primary/20 flex items-center justify-center text-primary">
          <Check size={48} strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-black">¡Tarea Traspasada!</h1>
        <p className="text-slate-500">Has pasado "{task.title}" a {selectedMember?.name}. El administrador verificará el pago pronto.</p>
        <button 
          onClick={() => setView('dashboard')}
          className="w-full bg-primary text-white font-black py-4 rounded-xl duo-shadow uppercase"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="p-4 space-y-6 flex-1 flex flex-col">
        <header className="flex items-center gap-4">
          <button onClick={() => setStep('select')} className="p-2 rounded-xl bg-slate-100"><X /></button>
          <h1 className="text-lg font-black">Pago a {selectedMember?.name}</h1>
        </header>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setPaymentMethod('nequi')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${paymentMethod === 'nequi' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Nequi
          </button>
          <button 
            onClick={() => setPaymentMethod('efectivo')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${paymentMethod === 'efectivo' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Efectivo
          </button>
        </div>

        {paymentMethod === 'nequi' ? (
          <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enviar a {selectedMember?.paymentInfo?.type === 'bancolombia' ? 'Bancolombia' : 'Nequi'} de {selectedMember?.name}</p>
              <p className="text-3xl font-black text-primary mt-1">{selectedMember?.paymentInfo?.number || '310 000 0000'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 italic">Valor a transferir: ${finalFine.toLocaleString()}</p>
              {penaltyMultiplier > 1 && (
                <p className="text-[10px] font-black text-rose-500 uppercase mt-1">¡Incluye Penalidad x{penaltyMultiplier}!</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl p-6 text-center">
            <p className="text-orange-800 font-bold">Entrega física de dinero</p>
            <p className="text-2xl font-black text-orange-600 mt-1">${finalFine.toLocaleString()}</p>
            {penaltyMultiplier > 1 && (
              <p className="text-[10px] font-black text-rose-500 uppercase mt-1">¡Incluye Penalidad x{penaltyMultiplier}!</p>
            )}
            <p className="text-xs text-orange-700 mt-2 italic">Toma una foto entregando el dinero o del recibo firmado.</p>
          </div>
        )}

        <div className="flex-1 flex flex-col space-y-4">
          <h3 className="font-bold text-slate-800">Evidencia del Pago</h3>
          <div 
            className={`flex-1 border-4 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-colors ${receipt ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50'}`}
            onClick={() => setReceipt('https://picsum.photos/seed/pass-receipt/400/600')}
          >
            {receipt ? (
              <div className="relative w-full h-full">
                <img src={receipt} className="w-full h-full object-cover rounded-xl" alt="Receipt" />
                <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={48} />
                </div>
              </div>
            ) : (
              <>
                <Camera size={48} className="text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400 text-center">Toca para tomar foto de la evidencia</p>
              </>
            )}
          </div>
        </div>

        <button 
          disabled={!receipt}
          onClick={() => setIsConfirmModalOpen(true)}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-wide transition-all ${receipt ? 'bg-primary text-white duo-shadow' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          Confirmar Traspaso
        </button>

        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={() => {
            setIsConfirmModalOpen(false);
            setStep('success');
          }}
          title="¿Confirmar traspaso?"
          message={`Se transferirá la tarea a ${selectedMember?.name} por $${finalFine.toLocaleString()}.`}
          confirmText="Sí, traspasar"
          cancelText="Cancelar"
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 flex-1 flex flex-col">
      <header className="flex items-center gap-4">
        <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100"><X /></button>
        <h1 className="text-lg font-black">Pasar Tarea</h1>
      </header>

      <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 duo-shadow flex items-center gap-4">
        <div className="size-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
          {React.createElement(IconMap[task.icon] || Utensils, { size: 24 })}
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{task.title}</h3>
          <p className="text-xs text-slate-500">Valor del traspaso: <span className="font-bold text-primary">${finalFine.toLocaleString()}</span></p>
          {penaltyMultiplier > 1 && (
            <p className="text-[10px] font-black text-rose-500 uppercase">Penalidad Aplicada x{penaltyMultiplier}</p>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">¿A quién le pasas la misión?</h3>
        <div className="grid grid-cols-1 gap-3">
          {otherMembers.map(member => (
            <button 
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${selectedMember?.id === member.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              <img src={member.avatar} className="size-12 rounded-full border-2 border-white shadow-sm" alt={member.name} />
              <div className="flex-1 text-left">
                <p className="font-bold text-slate-800">{member.name}</p>
                <p className="text-xs text-slate-500">Nivel {member.level} • {member.xp} XP</p>
              </div>
              {selectedMember?.id === member.id && <Check className="text-primary" size={24} />}
            </button>
          ))}
        </div>
      </div>

      <button 
        disabled={!selectedMember}
        onClick={() => setStep('payment')}
        className={`w-full py-4 rounded-xl font-black uppercase tracking-wide transition-all ${selectedMember ? 'bg-primary text-white duo-shadow' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
      >
        Siguiente: Pagar a {selectedMember?.name || '...'}
      </button>
    </div>
  );
}

function CreateTaskScreen({ members, setView, onSave, darkMode }: { members: Member[], setView: (v: View) => void, onSave: (t: Task, repeat: boolean) => void, darkMode: boolean }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [xp, setXp] = useState(50);
  const [fine, setFine] = useState(5000);
  const [value, setValue] = useState(5000);
  const [category, setCategory] = useState('General');
  const [taskType, setTaskType] = useState<'duty' | 'obligation'>('duty');
  const [selectedIcon, setSelectedIcon] = useState('Utensils');
  const [assignedTo, setAssignedTo] = useState('');
  const [repeatDays, setRepeatDays] = useState(false);

  const handleSave = () => {
    if (!title) return;
    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title,
      description,
      xp,
      fine,
      value,
      status: 'pending',
      icon: selectedIcon,
      category,
      taskType,
      assignedTo: assignedTo || undefined,
      dueDate: new Date('2026-03-02T10:15:28-08:00').toISOString()
    };
    onSave(newTask, repeatDays);
    setView('dashboard');
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className={`p-4 border-b-2 flex items-center gap-4 transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
        <h1 className="font-bold text-lg">Nueva Tarea</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">Título de la Tarea</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Limpiar el patio"
            className={`w-full p-4 rounded-xl border-2 outline-none focus:border-primary transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">Asignar a (Opcional)</label>
          <select 
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className={`w-full p-4 rounded-xl border-2 outline-none focus:border-primary transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}
          >
            <option value="">Todos</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <p className="font-bold text-sm">Repetir por 7 días</p>
            <p className="text-xs text-slate-500">Se crearán 7 tareas individuales</p>
          </div>
          <button 
            onClick={() => setRepeatDays(!repeatDays)}
            className={`w-12 h-6 rounded-full transition-colors relative ${repeatDays ? 'bg-primary' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${repeatDays ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">Descripción</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles adicionales..."
            className={`w-full p-4 rounded-xl border-2 outline-none focus:border-primary transition-all h-24 resize-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">Seleccionar Ícono</label>
          <div className="grid grid-cols-5 gap-3">
            {Object.keys(IconMap).map(iconName => {
              const Icon = IconMap[iconName];
              return (
                <button
                  key={iconName}
                  onClick={() => setSelectedIcon(iconName)}
                  className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-all ${selectedIcon === iconName ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-100 text-slate-400')}`}
                >
                  <Icon size={24} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Recompensa (XP)</label>
            <input 
              type="number" 
              value={xp}
              onChange={(e) => setXp(Number(e.target.value))}
              className={`w-full p-4 rounded-xl border-2 outline-none focus:border-primary transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Multa ($)</label>
            <input 
              type="number" 
              value={fine}
              onChange={(e) => setFine(Number(e.target.value))}
              className={`w-full p-4 rounded-xl border-2 outline-none focus:border-primary transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Valor Tarea ($)</label>
            <input 
              type="number" 
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className={`w-full p-4 rounded-xl border-2 outline-none focus:border-primary transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipo de Tarea</label>
          <div className="flex gap-3">
            <button 
              onClick={() => setTaskType('obligation')}
              className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${taskType === 'obligation' ? 'bg-primary border-primary text-white' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-100 text-slate-500')}`}
            >
              Obligación (Con Foto)
            </button>
            <button 
              onClick={() => setTaskType('duty')}
              className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${taskType === 'duty' ? 'bg-primary border-primary text-white' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-100 text-slate-500')}`}
            >
              Deber (Check)
            </button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-4 bg-primary text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95"
        >
          Crear Tarea
        </button>
      </div>
    </div>
  );
}

function ProfileScreen({ user, onUpdateUser, setView, onLogout, currentUser }: { user: Member, onUpdateUser: (m: Member) => void, setView: (v: View) => void, onLogout: () => void, currentUser: Member }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [debt, setDebt] = useState(user.debt);
  const [paymentType, setPaymentType] = useState<'nequi' | 'bancolombia'>(user.paymentInfo?.type || 'nequi');
  const [paymentNumber, setPaymentNumber] = useState(user.paymentInfo?.number || '');
  const [darkMode, setDarkMode] = useState(user.settings?.darkMode || false);
  const [availability, setAvailability] = useState<Record<string, string[]>>(user.availability || {});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const slots = ['Mañana', 'Tarde', 'Noche'];

  const toggleSlot = (day: string, slot: string) => {
    const currentSlots = availability[day] || [];
    const newSlots = currentSlots.includes(slot) 
      ? currentSlots.filter(s => s !== slot)
      : [...currentSlots, slot];
    setAvailability({ ...availability, [day]: newSlots });
  };

  const handleSave = () => {
    onUpdateUser({
      ...user,
      name,
      avatar,
      paymentInfo: {
        type: paymentType,
        number: paymentNumber
      },
      availability,
      debt,
      settings: {
        darkMode
      }
    });
    setIsEditing(false);
    alert('Perfil actualizado');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className={`p-4 border-b-2 flex items-center justify-between transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
          <h1 className="font-bold text-lg">Mi Perfil</h1>
        </div>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${isEditing ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
        >
          {isEditing ? 'Guardar' : 'Editar'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="size-28 rounded-full border-4 border-primary/20 p-1 transition-transform group-hover:scale-105">
              <img src={avatar} className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 object-cover" alt={name} />
            </div>
            {isEditing && (
              <div className="absolute -bottom-2 -right-2 flex flex-col gap-2">
                <button 
                  onClick={handleRandomAvatar}
                  className="bg-primary text-white p-2 rounded-full border-2 border-white dark:border-slate-900 shadow-lg hover:scale-110 transition-transform"
                  title="Avatar Aleatorio"
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-500 text-white p-2 rounded-full border-2 border-white dark:border-slate-900 shadow-lg hover:scale-110 transition-transform"
                  title="Subir Foto"
                >
                  <Camera size={16} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
              </div>
            )}
          </div>
          <div className="w-full">
            {isEditing ? (
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-2xl font-black text-center w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:border-primary transition-all"
              />
            ) : (
              <>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">{user.name}</h2>
                <p className="text-primary font-bold">Nivel {user.level} • {user.xp} XP</p>
                <div className="mt-2 inline-block px-4 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border-2 border-slate-200 dark:border-slate-700">
                  <p className={`text-xs font-black uppercase tracking-widest ${user.debt < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    Deuda: ${user.debt.toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {currentUser.role === 'admin' && isEditing && (
          <div className={`rounded-2xl border-2 p-5 space-y-4 duo-shadow transition-colors duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-3 text-slate-400">
              <ArrowUpDown size={20} />
              <h3 className="font-bold text-xs uppercase tracking-widest">Editar Deuda (Admin)</h3>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Monto de Deuda (Negativo = Debe)</label>
              <input 
                type="number" 
                value={debt}
                onChange={(e) => setDebt(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-slate-300 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className={`rounded-2xl border-2 p-5 space-y-4 duo-shadow transition-colors duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-400">
                {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                <h3 className="font-bold text-xs uppercase tracking-widest">Tema Oscuro</h3>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${darkMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className={`rounded-2xl border-2 p-5 flex items-center justify-between duo-shadow transition-colors duration-300 ${darkMode ? 'bg-slate-800 border-slate-700 text-rose-400' : 'bg-white border-slate-100 text-rose-500'}`}
          >
            <div className="flex items-center gap-3">
              <LogOut size={20} />
              <h3 className="font-bold text-xs uppercase tracking-widest">Cerrar Sesión</h3>
            </div>
            <ChevronRight size={20} />
          </button>

          {/* Availability Section */}
          <div className={`rounded-2xl border-2 p-5 space-y-4 duo-shadow transition-colors duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-3 text-slate-400">
              <Calendar size={20} />
              <h3 className="font-bold text-xs uppercase tracking-widest">Mi Disponibilidad</h3>
            </div>
            <div className="space-y-4">
              {days.map(day => (
                <div key={day} className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</p>
                  <div className="flex gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot}
                        disabled={!isEditing}
                        onClick={() => toggleSlot(day, slot)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${availability[day]?.includes(slot) ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : (darkMode ? 'bg-slate-900 border-slate-700 text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-400')} ${!isEditing && 'opacity-80'}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border-2 p-5 space-y-4 duo-shadow transition-colors duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-3 text-slate-400">
            <Shield size={20} />
            <h3 className="font-bold text-xs uppercase tracking-widest">Información de Pago</h3>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                <button 
                  onClick={() => setPaymentType('nequi')}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${paymentType === 'nequi' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-500'}`}
                >
                  Nequi
                </button>
                <button 
                  onClick={() => setPaymentType('bancolombia')}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${paymentType === 'bancolombia' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-500'}`}
                >
                  Bancolombia
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Número de Cuenta / Celular</label>
                <input 
                  type="text" 
                  value={paymentNumber}
                  onChange={(e) => setPaymentNumber(e.target.value)}
                  placeholder="Ej: 300 123 4567"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-slate-300 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                  {user.paymentInfo?.type === 'bancolombia' ? 'Bancolombia' : 'Nequi'}
                </p>
                <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {user.paymentInfo?.number || 'No configurado'}
                </p>
              </div>
              <div className={`size-12 rounded-xl flex items-center justify-center ${user.paymentInfo?.type === 'bancolombia' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-primary/10 text-primary'}`}>
                {user.paymentInfo?.type === 'bancolombia' ? <Shield size={24} /> : <Flame size={24} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmPayments({ setView }: { setView: (v: View) => void }) {
  const [payments, setPayments] = useState([
    { id: '1', member: MEMBERS[1], amount: 20000, date: 'Hace 2 horas', receipt: 'https://picsum.photos/seed/receipt1/400/600', status: 'pending' },
    { id: '2', member: MEMBERS[3], amount: 5000, date: 'Ayer', receipt: 'https://picsum.photos/seed/receipt2/400/600', status: 'pending' }
  ]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const handleConfirm = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
    if (payments.length === 1) {
      alert('¡Todos los pagos confirmados!');
      setView('admin');
    }
    setSelectedPaymentId(null);
  };

  return (
    <div className="p-4 space-y-6 flex-1 flex flex-col">
      <header className="flex items-center gap-4">
        <button onClick={() => setView('admin')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
        <h1 className="text-lg font-black">Confirmar Pagos</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {payments.map(payment => (
          <div key={payment.id} className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 duo-shadow space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={payment.member.avatar} className="size-10 rounded-full border-2 border-primary" alt={payment.member.name} />
                <div>
                  <p className="font-bold">{payment.member.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black">{payment.date}</p>
                </div>
              </div>
              <span className="font-black text-primary">${payment.amount.toLocaleString()}</span>
            </div>
            
            <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-100 dark:border-slate-700">
              <ZoomableImage src={payment.receipt} alt="Receipt" className="w-full h-full object-cover" />
            </div>

            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 font-bold text-red-500">Rechazar</button>
              <button 
                onClick={() => setSelectedPaymentId(payment.id)}
                className="flex-[2] py-3 rounded-xl bg-primary text-white font-black uppercase tracking-wider shadow-lg shadow-primary/20"
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={!!selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
        onConfirm={() => selectedPaymentId && handleConfirm(selectedPaymentId)}
        title="¿Confirmar este pago?"
        message="Una vez confirmado, el saldo del usuario se actualizará y la deuda desaparecerá."
        confirmText="Sí, confirmar"
        cancelText="Cancelar"
      />
    </div>
  );
}
