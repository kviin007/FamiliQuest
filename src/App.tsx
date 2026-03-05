import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Image as ImageIcon,
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
import { View, Task, Member, Payment, Alert, ChatMessage, Appeal, TaskRequest } from './types';
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
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<Member>(MEMBERS[0]);
  const userRef = useRef<Member | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [currentView, setCurrentView] = useState<View>('login');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [members, setMembers] = useState<Member[]>(MEMBERS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', userId: 'admin', userName: 'Admin', userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', text: '¡Bienvenidos al chat familiar! Recuerden completar sus tareas antes del domingo.', timestamp: new Date().toISOString(), isAdminAlert: true },
  ]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [taskRequests, setTaskRequests] = useState<TaskRequest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([
    { id: '1', userId: 'styven', userName: 'Styven', amount: 5000, date: new Date().toISOString(), status: 'pending', type: 'fine' },
    { id: '2', userId: 'isabella', userName: 'Isabella', amount: 2000, date: new Date().toISOString(), status: 'pending', type: 'fine' },
  ]);

  const [paymentConfig, setPaymentConfig] = useState({
    type: 'nequi' as 'nequi' | 'bancolombia',
    number: '3024468046',
    owner: 'Admin'
  });

  const ws = useRef<WebSocket | null>(null);

  // Fetch initial state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        setMembers(data.members);
        setTasks(data.tasks);
        setAlerts(data.alerts);
        setMessages(data.messages);
        const reqRes = await fetch('/api/task-requests');
        const reqData = await reqRes.json();
        setTaskRequests(reqData);
      } catch (err) {
        console.error("Failed to fetch state", err);
      }
    };
    fetchState();
    requestPermissions();

    // WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    ws.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      if (userRef.current && isLoggedIn) {
        socket.send(JSON.stringify({ type: 'IDENTIFY', userId: userRef.current.id }));
      }
    };
    socket.onclose = () => setIsConnected(false);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'TASK_UPDATED':
          setTasks(prev => {
            const exists = prev.find(t => t.id === data.task.id);
            if (exists) return prev.map(t => t.id === data.task.id ? data.task : t);
            return [data.task, ...prev];
          });
          break;
        case 'TASK_DELETED':
          setTasks(prev => prev.filter(t => t.id !== data.taskId));
          break;
        case 'MEMBER_UPDATED':
          setMembers(prev => prev.map(m => m.id === data.member.id ? data.member : m));
          if (userRef.current && userRef.current.id === data.member.id) setUser(data.member);
          break;
        case 'ALERT_ADDED':
          setAlerts(prev => [data.alert, ...prev]);
          break;
        case 'MESSAGE_ADDED':
          setMessages(prev => [...prev, data.message]);
          break;
        case 'USER_ONLINE':
          setMembers(prev => prev.map(m => m.id === data.userId ? { ...m, isOnline: true } : m));
          break;
        case 'USER_OFFLINE':
          setMembers(prev => prev.map(m => m.id === data.userId ? { ...m, isOnline: false } : m));
          break;
        case 'MEMBER_DELETED':
          setMembers(prev => prev.filter(m => m.id !== data.userId));
          if (userRef.current && userRef.current.id === data.userId) {
            setUser(null);
            setIsLoggedIn(false);
            setCurrentView('login');
          }
          break;
        case 'TASK_REQUEST_UPDATED':
          setTaskRequests(prev => {
            const exists = prev.find(r => r.id === data.request.id);
            if (exists) return prev.map(r => r.id === data.request.id ? data.request : r);
            return [data.request, ...prev];
          });
          break;
        case 'TASK_REQUEST_DELETED':
          setTaskRequests(prev => prev.filter(r => r.id !== data.requestId));
          break;
        case 'LOG_ADDED':
          // Logs are fetched on demand in admin view, but we could update state if we had it
          break;
      }
    };

    return () => socket.close();
  }, []);

  const syncTask = async (task: Task) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
  };

  const syncTaskRequest = async (request: TaskRequest) => {
    await fetch('/api/task-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  };

  const deleteRequest = async (id: string) => {
    await fetch(`/api/task-requests/${id}`, { method: 'DELETE' });
  };

  const syncMember = async (member: Member) => {
    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member)
    });
  };

  const syncAlert = async (alert: Alert) => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });
    logAction('ALERT_CREATED', `Alerta creada: ${alert.title}`);
  };

  const logAction = async (action: string, details: string, userId?: string, userName?: string) => {
    const id = userId || user?.id;
    const name = userName || user?.name;
    if (!id) return;
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: id,
        userName: name,
        action,
        details,
        timestamp: new Date().toISOString()
      })
    });
  };

  const checkDeadlines = useCallback(() => {
    if (!userRef.current) return;
    const now = new Date();
    
    tasks.forEach(task => {
      if (task.status === 'pending' && task.assignedTo === userRef.current?.id) {
        const dueDate = new Date(task.dueDate || '');
        const diffTime = now.getTime() - dueDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        // Obligations: 1 day deadline
        // Duties: 7 days deadline
        const isExpired = (task.taskType === 'obligation' && diffDays > 1) || 
                          (task.taskType === 'duty' && diffDays > 7);
        
        if (isExpired) {
          // Apply penalty
          const penalty = task.fine || (task.value * 2);
          const updatedUser = { 
            ...userRef.current!, 
            debt: userRef.current!.debt - penalty,
            monthlyDebt: (userRef.current!.monthlyDebt || 0) - penalty
          };
          const updatedTask = { ...task, status: 'failed' as const };
          
          syncTask(updatedTask);
          syncMember(updatedUser);
          logAction('TASK_EXPIRED', `Tarea expirada: ${task.title}. Penalidad aplicada: $${penalty}`);
          alert(`La tarea "${task.title}" ha expirado. Se ha aplicado una penalidad de $${penalty}.`);
        }
      }
    });
  }, [tasks, syncTask, syncMember, logAction]);

  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Camera permission granted");
    } catch (err) {
      console.warn("Camera permission denied or not available", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      checkDeadlines();
      requestPermissions();
    }
  }, [isLoggedIn, checkDeadlines]);

  const syncMessage = async (msg: ChatMessage) => {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
  };

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

  const handleLogin = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      if (res.ok) {
        const foundUser = await res.json();
        setUser(foundUser);
        setIsLoggedIn(true);
        setCurrentView('dashboard');
        logAction('LOGIN', `Usuario inició sesión: ${foundUser.name}`, foundUser.id, foundUser.name);
        
        // Identify on login if socket is open
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'IDENTIFY', userId: foundUser.id }));
        }

        // Show tutorial if first time
        if (!foundUser.settings?.hasSeenTutorial) {
          setShowTutorial(true);
          setTutorialStep(0);
        }
      } else {
        alert('Credenciales incorrectas');
      }
    } catch (err) {
      alert('Error al conectar con el servidor');
    }
  };

  const handleLogout = async () => {
    if (user) {
      logAction('LOGOUT', 'Usuario cerró sesión');
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      // Close socket to trigger offline status
      if (ws.current) {
        ws.current.close();
      }
      
      setIsLoggedIn(false);
      setUser(MEMBERS[0]);
      setCurrentView('login');
    }
  };

  const handleUpdateUser = (updatedUser: Member) => {
    setUser(updatedUser);
    syncMember(updatedUser);
    logAction('USER_UPDATED', `Usuario actualizado: ${updatedUser.name}`);
  };

  const handleCreateUser = (newUser: Member) => {
    syncMember(newUser);
    logAction('USER_CREATED', `Usuario creado: ${newUser.name}`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('¿Estás seguro de eliminar a este usuario?')) {
      await fetch(`/api/members/${userId}`, { method: 'DELETE' });
      logAction('USER_DELETED', `Usuario eliminado: ${userId}`);
    }
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
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = { ...task, status: 'completed' as const, imageUrl: proof, completedAt: now };
      syncTask(updatedTask);
      logAction('TASK_COMPLETED', `Tarea completada: ${task.title}`);
    }
    setCurrentView('dashboard');
  };

  const handleStartVoting = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = { ...task, isVotingActive: true, votes: [] };
      syncTask(updatedTask);
      logAction('VOTING_STARTED', `Votación iniciada: ${task.title}`);
      alert('Votación iniciada para esta tarea.');
    }
  };

  const handleCastVote = (taskId: string, userId: string, vote: 'good' | 'bad') => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const existingVotes = task.votes || [];
      const filteredVotes = existingVotes.filter(v => v.userId !== userId);
      const updatedTask = { ...task, votes: [...filteredVotes, { userId, vote }] };
      syncTask(updatedTask);
    }
  };

  const handleValidateTask = async (taskId: string, approved: boolean, customDebtChange?: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, status: (approved ? 'validated' : 'failed') as any, isVotingActive: false };
    await syncTask(updatedTask);
    logAction('TASK_VALIDATED', `Tarea ${approved ? 'aprobada' : 'rechazada'}: ${task.title}`);

    if (approved) {
      const userId = task.assignedTo;
      const member = members.find(m => m.id === userId);
      if (member) {
        const debtChange = customDebtChange !== undefined ? customDebtChange : (task.value || 0);
        const updatedMember = {
          ...member,
          debt: member.debt + debtChange,
          monthlyDebt: (member.monthlyDebt || 0) + debtChange,
          xp: member.xp + task.xp,
          progress: Math.min(100, member.progress + 5)
        };
        syncMember(updatedMember);
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
          await syncTask(penaltyTask1);
          await syncTask(penaltyTask2);
          alert('La mayoría votó "Mal Ejecutado". Se han asignado 2 obligaciones de penalidad con costo doble.');
        }
      }
    }
  };

  const handleApproveRequest = async (request: TaskRequest) => {
    const templateTask = tasks.find(t => t.id === request.taskId);
    if (!templateTask) return;

    // Create a new task instance for the user
    const newTask: Task = {
      ...templateTask,
      id: Math.random().toString(36).substring(7),
      assignedTo: request.userId,
      status: 'pending',
      dueDate: getNextOccurrence(request.day, request.slot),
      isVotingActive: false,
      votes: [],
      imageUrl: undefined,
      completedAt: undefined
    };

    await syncTask(newTask);
    await syncTaskRequest({ ...request, status: 'approved' });
    logAction('TASK_REQUEST_APPROVED', `Solicitud de "${templateTask.title}" aprobada para ${request.userId}`);
    alert('Solicitud aprobada');
  };

  const handleRejectRequest = async (requestId: string) => {
    const request = taskRequests.find(r => r.id === requestId);
    if (request) {
      await syncTaskRequest({ ...request, status: 'rejected' });
      logAction('TASK_REQUEST_REJECTED', `Solicitud rechazada para ${request.userId}`);
      alert('Solicitud rechazada');
    }
  };

  const getNextOccurrence = (dayName: string, slot: string) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const targetDay = days.indexOf(dayName);
    const now = new Date();
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    
    const nextDate = new Date();
    nextDate.setDate(now.getDate() + diff);
    
    // Set time based on slot
    if (slot === 'Mañana') nextDate.setHours(9, 0, 0, 0);
    else if (slot === 'Tarde') nextDate.setHours(15, 0, 0, 0);
    else nextDate.setHours(21, 0, 0, 0);
    
    return nextDate.toISOString();
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
        return <Dashboard tasks={filteredTasks} user={user} members={members} setView={setCurrentView} onPassTask={handlePassTask} isConnected={isConnected} onCompleteDuty={(id) => {
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
            onDeleteUser={handleDeleteUser}
            onUpdateUser={handleUpdateUser}
            onValidateTask={handleValidateTask}
            onStartVoting={handleStartVoting}
            onAddAlert={(a) => syncAlert(a)}
            onAssignTask={(taskId, userId) => {
              const task = tasks.find(t => t.id === taskId);
              if (task) {
                const updatedTask = { ...task, assignedTo: userId };
                syncTask(updatedTask);
                logAction('TASK_ASSIGNED', `Tarea "${task.title}" asignada a ${userId}`);
                alert(`Tarea asignada con éxito`);
              }
            }}
            onDeleteTask={async (taskId) => {
              await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
              logAction('TASK_DELETED', `Tarea eliminada: ${taskId}`);
              alert('Tarea eliminada');
            }}
            setView={setCurrentView} 
            currentUser={user}
            paymentConfig={paymentConfig}
            onUpdatePaymentConfig={setPaymentConfig}
            taskRequests={taskRequests}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
          />
        );
      case 'upload':
        return <UploadEvidence task={selectedTask} setView={setCurrentView} onComplete={(proof) => handleCompleteTask(selectedTask?.id || '', proof)} />;
      case 'alert':
        return <AlertScreen alerts={alerts} setView={setCurrentView} user={user} onAddAlert={(a) => syncAlert(a)} members={members} />;
      case 'voting':
        return <VotingScreen setView={setCurrentView} tasks={tasks} members={members} user={user} onCastVote={handleCastVote} />;
      case 'ranking':
        return <RankingScreen setView={setCurrentView} />;
      case 'settlement':
        return <SettlementScreen setView={setCurrentView} user={user} tasks={tasks} paymentConfig={paymentConfig} isDarkMode={isDarkMode} />;
      case 'invitation':
        return <InvitationScreen setView={setCurrentView} />;
      case 'chat':
        return <ChatScreen messages={messages} user={user} setView={setCurrentView} onSendMessage={(msg) => setMessages(prev => [...prev, msg])} onDeleteMessage={(id) => setMessages(prev => prev.filter(m => m.id !== id))} syncMessage={syncMessage} />;
      case 'tutorial':
        return <TutorialView setView={setCurrentView} />;
      case 'profile':
        return <ProfileScreen user={user} onUpdateUser={handleUpdateUser} setView={setCurrentView} onLogout={handleLogout} currentUser={user} />;
      case 'task-selection':
        return <TaskSelectionScreen tasks={tasks} user={user} taskRequests={taskRequests} onAddRequest={syncTaskRequest} setView={setCurrentView} />;
      case 'pass-task':
        return <PassTaskScreen task={selectedTask} members={members} user={user} setView={setCurrentView} onPass={(taskId, toUserId, fine) => {
          const task = tasks.find(t => t.id === taskId);
          const fromUser = user;
          const toUser = members.find(m => m.id === toUserId);
          if (task && toUser) {
            const updatedTask = { ...task, assignedTo: toUserId };
            const updatedFromUser = { ...fromUser, debt: fromUser.debt - fine, monthlyDebt: (fromUser.monthlyDebt || 0) - fine };
            const updatedToUser = { ...toUser, debt: toUser.debt + fine, monthlyDebt: (toUser.monthlyDebt || 0) + fine };
            syncTask(updatedTask);
            syncMember(updatedFromUser);
            syncMember(updatedToUser);
            alert('Traspaso completado');
            setCurrentView('dashboard');
          }
        }} />;
      case 'confirm-payments':
        return <ConfirmPayments setView={setCurrentView} />;
      case 'create-task':
        return <CreateTaskScreen members={members} setView={setCurrentView} onSave={(newTask, repeatDays) => {
          if (repeatDays) {
            for (let i = 0; i < 7; i++) {
              const date = new Date();
              date.setDate(date.getDate() + i);
              const dayName = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
              const t = {
                ...newTask,
                id: Math.random().toString(36).substring(7),
                title: `${newTask.title} ${dayName}`,
                dueDate: date.toISOString()
              };
              syncTask(t);
            }
          } else {
            syncTask(newTask);
          }
        }} darkMode={isDarkMode} />;
      default:
        return <Dashboard tasks={tasks} user={user} members={members} setView={setCurrentView} onPassTask={handlePassTask} onCompleteDuty={(id) => handleCompleteTask(id)} isDarkMode={isDarkMode} isConnected={isConnected} />;
    }
  };

  return (
    <>
      {/* Welcome Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <WelcomeTutorial 
            step={tutorialStep} 
            onNext={() => setTutorialStep(prev => prev + 1)} 
            onSkip={() => {
              setShowTutorial(false);
              const updatedUser = { 
                ...user, 
                settings: { ...user.settings, hasSeenTutorial: true, darkMode: user.settings?.darkMode || false } 
              };
              syncMember(updatedUser);
            }}
            onFinish={() => {
              setShowTutorial(false);
              const updatedUser = { 
                ...user, 
                settings: { ...user.settings, hasSeenTutorial: true, darkMode: user.settings?.darkMode || false } 
              };
              syncMember(updatedUser);
            }}
          />
        )}
      </AnimatePresence>

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
    </>
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

function TaskSelectionScreen({ tasks, user, taskRequests, onAddRequest, setView }: { tasks: Task[], user: Member, taskRequests: TaskRequest[], onAddRequest: (r: TaskRequest) => void, setView: (v: View) => void }) {
  const [selectedDay, setSelectedDay] = useState('Lunes');
  const [selectedSlot, setSelectedSlot] = useState('Mañana');
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const slots = ['Mañana', 'Tarde', 'Noche'];
  const isDarkMode = user.settings?.darkMode;

  // Available tasks are those not assigned to anyone
  const availableTasks = tasks.filter(t => !t.assignedTo);
  
  const myRequests = taskRequests.filter(r => r.userId === user.id);
  const requestsForSelectedDay = myRequests.filter(r => r.day === selectedDay);

  const handleRequest = (task: Task) => {
    // Limits check
    const dutiesCount = requestsForSelectedDay.filter(r => {
      const t = tasks.find(tk => tk.id === r.taskId);
      return t?.taskType === 'duty';
    }).length;
    const obligationsCount = requestsForSelectedDay.filter(r => {
      const t = tasks.find(tk => tk.id === r.taskId);
      return t?.taskType === 'obligation';
    }).length;

    if (task.taskType === 'duty' && dutiesCount >= 5) {
      alert('Límite de 5 deberes por día alcanzado');
      return;
    }
    if (task.taskType === 'obligation' && obligationsCount >= 2) {
      alert('Límite de 2 obligaciones por día alcanzado');
      return;
    }

    const newRequest: TaskRequest = {
      id: Math.random().toString(36).substring(7),
      userId: user.id,
      taskId: task.id,
      day: selectedDay,
      slot: selectedSlot,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    onAddRequest(newRequest);
    alert('Solicitud enviada al administrador');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className={`p-4 border-b-2 flex items-center justify-between transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
          <h1 className="font-bold text-lg">Solicitar Tareas</h1>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <section className="space-y-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 px-1">1. Selecciona el Día</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {days.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all ${selectedDay === day ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 px-1">2. Selecciona el Horario</h3>
          <div className="flex gap-2">
            {slots.map(slot => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${selectedSlot === slot ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
              >
                {slot}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 px-1">3. Elige tus Misiones</h3>
          <div className="space-y-3">
            {availableTasks.map(task => {
              const Icon = IconMap[task.icon] || Utensils;
              const isRequested = myRequests.some(r => r.taskId === task.id && r.day === selectedDay && r.slot === selectedSlot);
              
              return (
                <div key={task.id} className={`p-4 rounded-2xl border-2 duo-shadow flex items-center gap-4 transition-all ${isRequested ? 'opacity-50 grayscale' : (isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100')}`}>
                  <div className={`size-12 rounded-xl flex items-center justify-center ${task.taskType === 'obligation' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{task.title}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      {task.taskType === 'obligation' ? 'Obligación' : 'Deber'} • {task.xp} XP
                    </p>
                  </div>
                  <button 
                    disabled={isRequested}
                    onClick={() => handleRequest(task)}
                    className={`p-2 rounded-lg transition-all ${isRequested ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}
                  >
                    {isRequested ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {myRequests.length > 0 && (
          <section className="space-y-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 px-1">Tus Solicitudes Pendientes</h3>
            <div className="space-y-2">
              {myRequests.map(req => {
                const task = tasks.find(t => t.id === req.taskId);
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="font-bold text-xs">{task?.title}</p>
                      <p className="text-[8px] font-black uppercase text-slate-400">{req.day} • {req.slot}</p>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${req.status === 'pending' ? 'bg-amber-100 text-amber-600' : req.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
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

function Dashboard({ tasks, user, members, setView, onPassTask, onCompleteDuty, isDarkMode, isConnected }: { tasks: Task[], user: Member, members: Member[], setView: (v: View) => void, onPassTask: (t: Task) => void, onCompleteDuty: (id: string) => void, isDarkMode: boolean, isConnected: boolean }) {
  const [sortBy, setSortBy] = useState<'xp' | 'dueDate' | 'category'>('dueDate');
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toLocaleDateString('es-ES', { weekday: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleDateString('es-ES', { weekday: 'long' }).slice(1));

  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const onlineMembers = members.filter(m => m.isOnline && m.id !== user.id);
  const admins = members.filter(m => m.role === 'admin');

  // Daily limits check for the selected day
  const filteredByDayTasks = tasks.filter(t => {
    if (t.assignedTo !== user.id) return false;
    if (!t.dueDate) return true;
    const taskDate = new Date(t.dueDate);
    const taskDayName = taskDate.toLocaleDateString('es-ES', { weekday: 'long' }).charAt(0).toUpperCase() + taskDate.toLocaleDateString('es-ES', { weekday: 'long' }).slice(1);
    return taskDayName === selectedDay;
  });

  const completedTasksOnSelectedDay = filteredByDayTasks.filter(t => 
    (t.status === 'completed' || t.status === 'validated')
  );

  const todaysObligations = completedTasksOnSelectedDay.filter(t => t.taskType === 'obligation').length;
  const todaysDuties = completedTasksOnSelectedDay.filter(t => t.taskType === 'duty').length;

  const canCompleteObligation = todaysObligations < 2;
  const canCompleteDuty = todaysDuties < 5;

  const sortedTasks = [...filteredByDayTasks].sort((a, b) => {
    if (sortBy === 'xp') return b.xp - a.xp;
    if (sortBy === 'category') return a.category.localeCompare(b.category);
    if (sortBy === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dateA - dateB;
    }
    return 0;
  });

  const completedDuties = filteredByDayTasks.filter(t => t.taskType === 'duty' && (t.status === 'completed' || t.status === 'validated')).length;
  const totalDuties = filteredByDayTasks.filter(t => t.taskType === 'duty').length;
  const completedObligations = filteredByDayTasks.filter(t => t.taskType === 'obligation' && (t.status === 'completed' || t.status === 'validated')).length;
  const totalObligations = filteredByDayTasks.filter(t => t.taskType === 'obligation').length;

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
          <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <div className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            {isConnected ? 'Sincronizado' : 'Desconectado'}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setView('tutorial')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-primary hover:scale-105 transition-transform mr-2"
              title="Guía de Inicio"
            >
              <Book size={20} />
            </button>
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
          <button 
            onClick={() => setView('task-selection')}
            className={`rounded-xl p-4 border-2 border-primary/20 bg-primary/5 duo-shadow flex flex-col items-center justify-center gap-1 hover:bg-primary/10 transition-all`}
          >
            <Plus className="text-primary" size={24} />
            <span className="text-primary font-black text-[10px] uppercase tracking-widest">Solicitar Tareas</span>
          </button>
        </section>

        {/* Day Filter Section */}
        <section className="space-y-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 px-1">Filtro por Día</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {dayNames.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all ${selectedDay === day ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </section>

        {/* Online Users Section */}
        <section className="space-y-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 px-1">En Línea Ahora</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className="relative">
                <img src={user.avatar} alt="Me" className="size-12 rounded-full border-2 border-emerald-500 p-0.5" />
                <div className="absolute bottom-0 right-0 size-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-500">Tú</span>
            </div>
            {onlineMembers.map(m => (
              <div key={m.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="relative">
                  <img src={m.avatar} alt={m.name} className="size-12 rounded-full border-2 border-emerald-500 p-0.5" />
                  <div className="absolute bottom-0 right-0 size-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500">{m.name}</span>
              </div>
            ))}
            {onlineMembers.length === 0 && (
              <p className="text-[10px] font-bold text-slate-400 italic py-4">Nadie más está en línea</p>
            )}
          </div>
        </section>

        {/* Admin Availability Calendar */}
        <section className={`rounded-2xl p-5 border-2 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-primary" size={20} />
            <h3 className="font-bold text-sm uppercase tracking-widest">Disponibilidad Admin</h3>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => {
              const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
              const dayName = dayNames[i];
              const isAvailable = admins.some(a => a.availability?.[dayName]?.length);
              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black text-slate-400">{day}</span>
                  <div className={`size-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${isAvailable ? 'bg-primary/20 text-primary border-2 border-primary/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-300 border-2 border-transparent'}`}>
                    {isAvailable ? '✓' : '×'}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-3 italic text-center">Consulta con Kevin o Jefa para validaciones</p>
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
                onComplete={() => {
                  if (task.taskType === 'obligation' && !canCompleteObligation) {
                    alert('Has alcanzado el límite de 2 obligaciones por día.');
                    return;
                  }
                  if (task.taskType === 'duty' && !canCompleteDuty) {
                    alert('Has alcanzado el límite de 5 deberes por día.');
                    return;
                  }
                  onCompleteDuty(task.id);
                }}
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

function AdminDashboard({ 
  members, 
  payments, 
  onApprovePayment, 
  onRejectPayment, 
  onCreateUser, 
  onDeleteUser, 
  onUpdateUser, 
  onValidateTask, 
  onStartVoting, 
  onAssignTask, 
  onDeleteTask, 
  onAddAlert, 
  setView, 
  tasks, 
  currentUser, 
  paymentConfig, 
  onUpdatePaymentConfig,
  taskRequests,
  onApproveRequest,
  onRejectRequest
}: { 
  members: Member[], 
  payments: Payment[],
  tasks: Task[],
  onApprovePayment: (id: string) => void,
  onRejectPayment: (id: string) => void,
  onCreateUser: (m: Member) => void,
  onDeleteUser: (id: string) => void,
  onUpdateUser: (m: Member) => void,
  onValidateTask: (taskId: string, approved: boolean, customDebtChange?: number) => void,
  onStartVoting?: (taskId: string) => void,
  onAssignTask: (taskId: string, userId: string) => void,
  onDeleteTask: (taskId: string) => void,
  onAddAlert: (a: Alert) => void,
  setView: (v: View) => void,
  currentUser: Member,
  paymentConfig: { type: 'nequi' | 'bancolombia', number: string, owner: string },
  onUpdatePaymentConfig: (config: { type: 'nequi' | 'bancolombia', number: string, owner: string }) => void,
  taskRequests: TaskRequest[],
  onApproveRequest: (r: TaskRequest) => void,
  onRejectRequest: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'tasks' | 'payments' | 'assign' | 'alerts' | 'calendar' | 'config' | 'logs' | 'requests'>('requests');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<Member | null>(null);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<string | null>(null);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetch('/api/logs').then(res => res.json()).then(setLogs);
    }
  }, [activeTab]);
  
  // Alert Form State
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'duty' | 'task' | 'general'>('general');
  const [alertRecipients, setAlertRecipients] = useState<string[]>([]);
  
  // Create/Edit User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');
  const [newUserDebt, setNewUserDebt] = useState(0);
  const [newUserMonthlyDebt, setNewUserMonthlyDebt] = useState(0);
  const [newUserXP, setNewUserXP] = useState(0);
  const [newUserAvatar, setNewUserAvatar] = useState('');

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
        debt: newUserDebt,
        monthlyDebt: newUserMonthlyDebt,
        xp: newUserXP,
        avatar: newUserAvatar || editingUser.avatar
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
        xp: newUserXP || 0,
        hearts: 5,
        streak: 0,
        debt: newUserDebt || -50000,
        monthlyDebt: newUserMonthlyDebt || 0,
        avatar: newUserAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUserName}`,
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
    setNewUserMonthlyDebt(0);
    setNewUserXP(0);
    setNewUserAvatar('');
  };

  const startEditing = (member: Member) => {
    setEditingUser(member);
    setNewUserName(member.name);
    setNewUserEmail(member.email);
    setNewUserPass(member.password || '');
    setNewUserRole(member.role);
    setNewUserDebt(member.debt);
    setNewUserMonthlyDebt(member.monthlyDebt || 0);
    setNewUserXP(member.xp);
    setNewUserAvatar(member.avatar);
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
        <button 
          onClick={() => setActiveTab('requests')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'requests' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Solicitudes
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'logs' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
        >
          Logs
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

            <div className="space-y-4 mt-6">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Estado de Miembros</h3>
              <div className="grid grid-cols-1 gap-3">
                {members.map(m => (
                  <div key={m.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <img src={m.avatar} className="size-10 rounded-full border-2 border-primary/20" alt={m.name} />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{m.name}</p>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nivel {m.level}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${m.monthlyDebt < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        ${(m.monthlyDebt || 0).toLocaleString()}
                      </p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deuda Mensual</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 mt-6">
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
                    placeholder="Deuda Semanal" 
                    value={newUserDebt}
                    onChange={(e) => setNewUserDebt(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deuda Mensual (Acumulado)</label>
                  <input 
                    type="number" 
                    placeholder="Deuda Mensual" 
                    value={newUserMonthlyDebt}
                    onChange={(e) => setNewUserMonthlyDebt(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Experiencia (XP)</label>
                  <input 
                    type="number" 
                    placeholder="XP" 
                    value={newUserXP}
                    onChange={(e) => setNewUserXP(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">URL del Avatar</label>
                  <input 
                    type="text" 
                    placeholder="https://..." 
                    value={newUserAvatar}
                    onChange={(e) => setNewUserAvatar(e.target.value)}
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
                    <div className="flex gap-2">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${member.debt < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        Sem: ${member.debt.toLocaleString()}
                      </p>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${member.monthlyDebt < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        Mes: ${(member.monthlyDebt || 0).toLocaleString()}
                      </p>
                    </div>
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
                    onClick={() => onDeleteUser(member.id)}
                    className="p-2 text-rose-400 hover:text-rose-600 transition-all"
                  >
                    <Trash2 size={18} />
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
            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border-2 border-primary/20 space-y-4 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <AlertTriangle size={20} />
                </div>
                <h4 className="font-black text-lg">Nueva Alerta Familiar</h4>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Título</label>
                <input 
                  type="text" 
                  placeholder="Ej: ¡Reunión Urgente!" 
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  className="w-full p-4 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mensaje</label>
                <textarea 
                  placeholder="Escribe el mensaje aquí..." 
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  className="w-full p-4 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary outline-none font-medium h-32 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Alerta</label>
                <div className="flex gap-2">
                  {(['general', 'duty', 'task'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setAlertType(type)}
                      className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs uppercase tracking-widest transition-all ${alertType === type ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                    >
                      {type === 'general' ? 'General' : type === 'duty' ? 'Deber' : 'Obligación'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Destinatarios</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        if (alertRecipients.includes(m.id)) {
                          setAlertRecipients(prev => prev.filter(id => id !== m.id));
                        } else {
                          setAlertRecipients(prev => [...prev, m.id]);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${alertRecipients.includes(m.id) ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                    >
                      <img src={m.avatar} className="size-5 rounded-full" alt={m.name} />
                      <span className="text-[10px] font-bold">{m.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setAlertRecipients(alertRecipients.length === members.length ? [] : members.map(m => m.id))}
                    className="px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    {alertRecipients.length === members.length ? 'Ninguno' : 'Todos'}
                  </button>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!alertTitle || !alertMessage) return;
                  onAddAlert({
                    id: Math.random().toString(36).substring(7),
                    title: alertTitle,
                    message: alertMessage,
                    type: alertType,
                    date: new Date().toISOString(),
                    createdBy: currentUser.id,
                    recipients: alertRecipients.length > 0 ? alertRecipients : undefined
                  });
                  setAlertTitle('');
                  setAlertMessage('');
                  setAlertRecipients([]);
                  alert('Alerta enviada con éxito');
                }}
                className="w-full py-4 bg-primary text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95"
              >
                Enviar Alerta
              </button>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Solicitudes y Aprobaciones</h3>
              <div className="flex gap-2">
                <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {taskRequests.filter(r => r.status === 'pending').length} Pendientes
                </div>
              </div>
            </div>

            {/* Task Requests Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Calendar size={14} /> Solicitudes de Asignación
              </h4>
              {taskRequests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <p className="text-slate-400 text-sm font-medium italic">No hay solicitudes de asignación</p>
                </div>
              ) : (
                taskRequests.filter(r => r.status === 'pending').map(req => {
                  const user = members.find(m => m.id === req.userId);
                  const task = tasks.find(t => t.id === req.taskId);
                  return (
                    <div key={req.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 space-y-3 shadow-sm hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <img src={user?.avatar} className="size-10 rounded-full border-2 border-primary/20" alt={user?.name} />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">{user?.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{task?.title}</p>
                            <p className="text-[10px] font-black uppercase text-primary mt-0.5">{req.day} • {req.slot}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onApproveRequest(req)}
                          className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          Aprobar
                        </button>
                        <button 
                          onClick={() => onRejectRequest(req.id)}
                          className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Task Validation Section (Completed Tasks) */}
            <div className="space-y-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <CheckCircle2 size={14} /> Tareas por Validar
              </h4>
              {tasks.filter(t => t.status === 'completed').length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <p className="text-slate-400 text-sm font-medium italic">No hay tareas completadas esperando validación</p>
                </div>
              ) : (
                tasks.filter(t => t.status === 'completed').map(task => {
                  const user = members.find(m => m.id === task.assignedTo);
                  return (
                    <div key={task.id} className="p-5 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-100 dark:border-slate-700 space-y-4 shadow-md">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <img src={user?.avatar} className="size-12 rounded-2xl border-2 border-primary/20" alt={user?.name} />
                          <div>
                            <p className="font-black text-slate-800 dark:text-white">{user?.name}</p>
                            <h5 className="text-sm font-bold text-primary">{task.title}</h5>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{task.taskType === 'obligation' ? 'Obligación' : 'Deber'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-emerald-500">+{task.xp} XP</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recompensa</p>
                        </div>
                      </div>

                      {task.imageUrl && (
                        <div className="aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-700">
                          <ZoomableImage src={task.imageUrl} alt="Evidence" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button 
                          onClick={() => onValidateTask(task.id, false)}
                          className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                        >
                          Rechazar
                        </button>
                        <button 
                          onClick={() => onValidateTask(task.id, true)}
                          className="flex-[2] py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          Validar Tarea
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Registro de Actividad</h3>
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-xs text-primary">{log.userName}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">{log.action}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{log.details}</p>
                </div>
              ))}
              {logs.length === 0 && <p className="text-center py-10 text-slate-400 text-sm italic">No hay registros aún</p>}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6 pb-10">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Gestionar Disponibilidad</h3>
            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border-2 border-primary/10 space-y-4">
              <div className="flex items-center gap-3">
                <img src={currentUser.avatar} alt="Me" className="size-10 rounded-full" />
                <div>
                  <p className="font-bold">Tu Disponibilidad (Admin)</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Se verá en el calendario familiar</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                  <div key={day} className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{day}</p>
                    <div className="flex gap-2">
                      {['Mañana', 'Tarde', 'Noche'].map(slot => {
                        const isSelected = currentUser.availability?.[day]?.includes(slot);
                        return (
                          <button
                            key={slot}
                            onClick={() => {
                              const currentDaySlots = currentUser.availability?.[day] || [];
                              const nextSlots = isSelected 
                                ? currentDaySlots.filter(s => s !== slot)
                                : [...currentDaySlots, slot];
                              
                              onUpdateUser({
                                ...currentUser,
                                availability: {
                                  ...currentUser.availability,
                                  [day]: nextSlots
                                }
                              });
                            }}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border-2 ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 pt-4">Otros Miembros</h3>
            {members.filter(m => m.id !== currentUser.id).map(member => (
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

            <div className={`p-6 bg-primary/5 rounded-3xl border-2 border-primary/20 space-y-4`}>
              <div className="flex items-center gap-3 text-primary">
                <Shield size={24} />
                <h4 className="font-black text-lg">¿Cómo publicar en Play Store?</h4>
              </div>
              <div className="space-y-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                <p>Para convertir esta PWA en una aplicación real de la Play Store, sigue estos pasos:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Crea una cuenta de desarrollador en <span className="text-primary font-bold">Google Play Console</span> ($25 USD).</li>
                  <li>Usa <span className="text-primary font-bold">Bubblewrap</span> para empaquetar la web como un archivo .TWA.</li>
                  <li>Genera el archivo <span className="text-primary font-bold">assetlinks.json</span> y colócalo en <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">.well-known/</code> de tu servidor.</li>
                  <li>Sube el archivo .aab generado a la consola de Google Play.</li>
                </ol>
                <p className="text-xs italic mt-4">Nota: Al ser una PWA, los usuarios ya pueden instalarla directamente desde Chrome sin pasar por la tienda.</p>
              </div>
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
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!image) return;
    setIsUploading(true);
    // Simulate upload
    setTimeout(() => {
      onComplete(image);
      setIsUploading(false);
      setView('dashboard');
    }, 1500);
  };

  if (!task) return null;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 p-4 space-y-6 overflow-y-auto">
      <header className="flex items-center gap-4">
        <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm"><X /></button>
        <h1 className="text-lg font-black">Subir Evidencia</h1>
      </header>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-700 duo-shadow space-y-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            {IconMap[task.icon] ? React.createElement(IconMap[task.icon], { size: 28 }) : <Star size={28} />}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">{task.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{task.description}</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 text-center">Captura o selecciona una foto real</p>
          
          <div 
            onClick={() => !image && fileInputRef.current?.click()}
            className={`aspect-square rounded-2xl border-4 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer overflow-hidden relative ${image ? 'border-primary' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 bg-slate-50 dark:bg-slate-900'}`}
          >
            {image ? (
              <>
                <img src={image} className="w-full h-full object-cover" alt="Evidence" />
                <button 
                  onClick={(e) => { e.stopPropagation(); setImage(null); }}
                  className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-full shadow-lg"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Camera size={32} />
                </div>
                <p className="text-sm font-bold text-slate-500">Tocar para capturar</p>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute('capture', 'environment');
                  fileInputRef.current.click();
                }
              }}
              className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center gap-2"
            >
              <Camera size={20} />
              Cámara
            </button>
            <button 
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                }
              }}
              className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center gap-2"
            >
              <ImageIcon size={20} />
              Galería
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
        </div>

        <button 
          onClick={handleSubmit}
          disabled={!image || isUploading}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${image && !isUploading ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
        >
          {isUploading ? (
            <>
              <RefreshCw className="animate-spin" size={20} />
              Subiendo...
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              Confirmar Entrega
            </>
          )}
        </button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border-2 border-amber-100 dark:border-amber-800/50 flex gap-3">
        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
          Asegúrate de que la foto sea clara. El administrador revisará esta evidencia antes de validar tu recompensa.
        </p>
      </div>
    </div>
  );
}

function AlertScreen({ alerts, setView, user, onAddAlert, members }: { alerts: Alert[], setView: (v: View) => void, user: Member, onAddAlert: (a: Alert) => void, members: Member[] }) {
  const isDarkMode = user.settings?.darkMode;

  const myAlerts = alerts.filter(a => !a.recipients || a.recipients.length === 0 || a.recipients.includes(user.id));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className={`p-4 border-b-2 flex items-center justify-between transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><X /></button>
          <h1 className="font-bold text-lg">Alertas Familiares</h1>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-4 overflow-y-auto">
        {myAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <AlertTriangle size={40} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-500">No hay alertas activas para ti</p>
          </div>
        ) : (
          myAlerts.map(alert => (
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
              <p className={`text-sm font-bold leading-relaxed mb-3 ${alert.type === 'duty' ? 'text-orange-900 dark:text-orange-200' : alert.type === 'task' ? 'text-blue-900 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'}`}>{alert.message}</p>
              
              {alert.recipients && alert.recipients.length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <span className="text-[8px] font-black uppercase text-slate-400">Para:</span>
                  <div className="flex -space-x-2">
                    {alert.recipients.map(rid => {
                      const m = members.find(mem => mem.id === rid);
                      return m ? <img key={rid} src={m.avatar} className="size-5 rounded-full border border-white dark:border-slate-800" title={m.name} alt={m.name} /> : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}

function WelcomeTutorial({ step, onNext, onSkip, onFinish }: { step: number, onNext: () => void, onSkip: () => void, onFinish: () => void }) {
  const steps = [
    {
      title: "¡Bienvenido a Family Quest!",
      description: "Esta aplicación te ayudará a gestionar tus tareas diarias y obligaciones familiares de forma divertida.",
      icon: <Shield className="text-primary" size={48} />
    },
    {
      title: "Configura tu Perfil",
      description: "Lo primero es ir a tu perfil y configurar tu número de Nequi/Bancolombia y tus horarios de disponibilidad.",
      icon: <User className="text-blue-500" size={48} />
    },
    {
      title: "Solicita Tareas",
      description: "En la sección 'Solicitar Tareas' podrás elegir qué quieres hacer cada día. Recuerda los límites diarios.",
      icon: <Plus className="text-emerald-500" size={48} />
    },
    {
      title: "Sube Evidencias",
      description: "Para las Obligaciones, deberás subir una foto como prueba. El administrador validará tu trabajo.",
      icon: <Camera className="text-amber-500" size={48} />
    },
    {
      title: "Evita Penalidades",
      description: "Si no completas tus tareas a tiempo, se te cobrará una multa automáticamente. ¡Mantente al día!",
      icon: <AlertTriangle className="text-rose-500" size={48} />
    }
  ];

  const currentStep = steps[step];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border-2 border-primary/20"
      >
        <div className="p-8 text-center space-y-6">
          <div className="size-24 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            {currentStep.icon}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">{currentStep.title}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          <div className="flex gap-1 justify-center">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} 
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-4">
            {step < steps.length - 1 ? (
              <>
                <button 
                  onClick={onNext}
                  className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  Siguiente
                </button>
                <button 
                  onClick={onSkip}
                  className="w-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Saltar Tutorial
                </button>
              </>
            ) : (
              <button 
                onClick={onFinish}
                className="w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                ¡Empezar ahora!
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TutorialView({ setView }: { setView: (v: View) => void }) {
  const steps = [
    {
      title: "Configura tu Cuenta",
      description: "Ve a tu perfil y asegúrate de colocar tu número de Nequi o Bancolombia para recibir pagos o gestionar deudas.",
      icon: <CreditCard className="text-primary" size={32} />
    },
    {
      title: "Define tu Horario",
      description: "En tu perfil, selecciona los días y jornadas (Mañana, Tarde, Noche) en los que estás disponible para realizar tareas.",
      icon: <Calendar className="text-blue-500" size={32} />
    },
    {
      title: "Solicita Tareas",
      description: "Ve a la sección 'Solicitar Tareas'. Podrás elegir entre Deberes (tareas diarias) y Obligaciones (tareas pesadas que requieren foto).",
      icon: <Plus className="text-emerald-500" size={32} />
    },
    {
      title: "Adjunta Evidencias",
      description: "Cuando termines una Obligación, haz clic en 'Completar' y sube una foto real de lo que hiciste. El administrador la validará.",
      icon: <Camera className="text-amber-500" size={32} />
    },
    {
      title: "Evita Multas",
      description: "Recuerda que las Obligaciones vencen en 1 día y los Deberes en 1 semana. Si no las haces, se te cobrará una multa automáticamente.",
      icon: <AlertTriangle className="text-rose-500" size={32} />
    }
  ];

  return (
    <div className="flex-1 flex flex-col p-4 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center gap-4">
        <button onClick={() => setView('dashboard')} className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm"><X /></button>
        <h1 className="text-lg font-black">Guía de Inicio</h1>
      </header>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 duo-shadow flex gap-4"
          >
            <div className="size-14 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-white">{step.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-3xl border-2 border-primary/20 space-y-4">
        <h3 className="font-black text-primary uppercase tracking-widest text-center">Lanzar en Android</h3>
        <ol className="text-xs space-y-2 text-slate-600 dark:text-slate-400 list-decimal pl-4 font-medium">
          <li>Abre esta URL en tu navegador Chrome en Android.</li>
          <li>Toca los tres puntos (menú) en la esquina superior derecha.</li>
          <li>Selecciona <b>"Instalar aplicación"</b> o <b>"Agregar a la pantalla de inicio"</b>.</li>
          <li>¡Listo! Ahora tendrás FamilyQuest como una aplicación nativa en tu celular.</li>
        </ol>
      </div>

      <button 
        onClick={() => setView('dashboard')}
        className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 mt-4"
      >
        ¡Entendido!
      </button>
    </div>
  );
}

function ChatScreen({ messages, user, setView, onSendMessage, onDeleteMessage, syncMessage }: { messages: ChatMessage[], user: Member, setView: (v: View) => void, onSendMessage: (m: ChatMessage) => void, onDeleteMessage: (id: string) => void, syncMessage: (m: ChatMessage) => void }) {
  const [inputText, setInputText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const isDarkMode = user.settings?.darkMode;
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    syncMessage(newMessage);
    setInputText('');
    setImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
                {msg.imageUrl && (
                  <div className="mt-1 rounded-xl overflow-hidden border border-white/20 mb-2">
                    <ZoomableImage src={msg.imageUrl} className="w-full max-h-60 object-cover" alt="Chat image" />
                  </div>
                )}
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
          <div className="relative size-24 rounded-2xl overflow-hidden border-2 border-primary shadow-lg">
            <img src={image} className="w-full h-full object-cover" alt="Preview" />
            <button onClick={() => setImage(null)} className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 shadow-lg"><X size={12} /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button 
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute('capture', 'environment');
                  fileInputRef.current.click();
                }
              }}
              className={`p-3 rounded-xl transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
            >
              <Camera size={20} />
            </button>
            <button 
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                }
              }}
              className={`p-3 rounded-xl transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
            >
              <ImageIcon size={20} />
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
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
            className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
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

function PassTaskScreen({ task, members, user, setView, onPass }: { task: Task | null, members: Member[], user: Member, setView: (v: View) => void, onPass: (taskId: string, toUserId: string, fine: number) => void }) {
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'nequi' | 'efectivo'>('nequi');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  if (!task) return null;

  const otherMembers = members.filter(m => m.id !== user.id);
  const penaltyMultiplier = task.penaltyMultiplier || 1;
  const baseFine = task.passCost || task.fine;
  const finalFine = baseFine * penaltyMultiplier;

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
            onPass(task.id, selectedMember?.id || '', finalFine);
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
  const [passCost, setPassCost] = useState(5000);
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
      passCost,
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
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Costo Traspaso ($)</label>
            <input 
              type="number" 
              value={passCost}
              onChange={(e) => setPassCost(Number(e.target.value))}
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
  const [xp, setXp] = useState(user.xp);
  const [debt, setDebt] = useState(user.debt);
  const [monthlyDebt, setMonthlyDebt] = useState(user.monthlyDebt || 0);
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
      xp,
      paymentInfo: {
        type: paymentType,
        number: paymentNumber
      },
      availability,
      debt,
      monthlyDebt,
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
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="bg-blue-500 text-white p-2 rounded-full border-2 border-white dark:border-slate-900 shadow-lg hover:scale-110 transition-transform"
                  title="Cámara"
                >
                  <Camera size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="bg-emerald-500 text-white p-2 rounded-full border-2 border-white dark:border-slate-900 shadow-lg hover:scale-110 transition-transform"
                  title="Galería"
                >
                  <ImageIcon size={16} />
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
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <div className="px-4 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border-2 border-slate-200 dark:border-slate-700">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${user.debt < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      Semanal: ${user.debt.toLocaleString()}
                    </p>
                  </div>
                  <div className="px-4 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border-2 border-slate-200 dark:border-slate-700">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${user.monthlyDebt < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      Mensual: ${(user.monthlyDebt || 0).toLocaleString()}
                    </p>
                  </div>
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
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Experiencia (XP)</label>
              <input 
                type="number" 
                value={xp}
                onChange={(e) => setXp(Number(e.target.value))}
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
