/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  Bell, 
  BellOff, 
  Calendar, 
  CheckCircle2, 
  Circle,
  Keyboard,
  X,
  Save,
  AlertTriangle,
  History
} from 'lucide-react';

// Types
interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  reminderTime?: number;
  alarmTriggered: boolean;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputText, setInputText] = useState('');
  const [reminderTime, setReminderTime] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Persistence: Load tasks
  useEffect(() => {
    const saved = localStorage.getItem('todo_tasks');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tasks", e);
      }
    }
  }, []);

  // Persistence: Save tasks
  useEffect(() => {
    localStorage.setItem('todo_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Alarm Sound Synthesis
  const startAlarmSound = useCallback(() => {
    if (isAlarmPlaying) return;
    
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;
    
    const playBeep = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    };

    const interval = setInterval(() => {
      if (!isAlarmPlaying) {
        clearInterval(interval);
        return;
      }
      playBeep();
    }, 1000);

    setIsAlarmPlaying(true);
  }, [isAlarmPlaying]);

  const stopAlarmSound = useCallback(() => {
    setIsAlarmPlaying(false);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Reminder Polling
  useEffect(() => {
    const checkReminders = setInterval(() => {
      const now = Date.now();
      let updated = false;
      const newTasks = tasks.map(task => {
        if (task.reminderTime && !task.alarmTriggered && task.reminderTime <= now) {
          startAlarmSound();
          updated = true;
          return { ...task, alarmTriggered: true };
        }
        return task;
      });

      if (updated) {
        setTasks(newTasks);
      }
    }, 1000);

    return () => clearInterval(checkReminders);
  }, [tasks, startAlarmSound]);

  // Add Task
  const addTask = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: inputText,
      completed: false,
      createdAt: Date.now(),
      reminderTime: reminderTime ? new Date(reminderTime).getTime() : undefined,
      alarmTriggered: false,
    };

    setTasks(prev => [newTask, ...prev]);
    setInputText('');
    setReminderTime('');
  };

  // Delete Task
  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // Delete All
  const deleteAll = () => {
    if (window.confirm('Tout supprimer ?')) {
      setTasks([]);
    }
  };

  // Toggle Complete
  const toggleComplete = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Edit Task
  const startEditing = (task: Task) => {
    const newText = prompt("Modifier la tâche :", task.text);
    if (newText !== null && newText.trim()) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, text: newText } : t));
    }
  };

  const saveEdit = () => {
    if (!editingId) return;
    setTasks(prev => prev.map(t => t.id === editingId ? { ...t, text: editText } : t));
    setEditingId(null);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        deleteAll();
      }
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        if (tasks.length > 0) {
          startEditing(tasks[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tasks]);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(ts);
  };

  const isOverdue = (task: Task) => {
    if (!task.reminderTime || task.completed) return false;
    return task.reminderTime < Date.now();
  };

  return (
    <div className="min-h-screen p-8 md:p-12 flex flex-col bg-[#fcfcfc] text-[#1a1a1a]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="editorial-title">TACHES</h1>
          <p className="italic text-2xl mt-2 font-serif opacity-70 tracking-tight">Organisation & Priorité</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-right"
        >
          <p className="text-sm font-semibold uppercase tracking-widest mb-1">
            {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-6xl font-light tracking-tighter tabular-nums">
            {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </motion.div>
      </div>

      {/* Alarm Warning Banner */}
      {isAlarmPlaying && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-black text-white p-6 mb-12 flex items-center justify-between alarm-ringing"
        >
          <div className="flex items-center gap-4">
            <Bell className="w-8 h-8 animate-pulse text-red-500" />
            <div>
              <p className="text-xs uppercase font-bold tracking-widest text-white/60">Alerte Active</p>
              <p className="text-xl font-serif italic">C'est le moment d'agir.</p>
            </div>
          </div>
          <button 
            onClick={stopAlarmSound}
            className="border border-white/30 hover:border-white px-8 py-2 text-xs font-bold uppercase tracking-widest transition-all"
          >
            Sourdine
          </button>
        </motion.div>
      )}

      {/* Content Layout */}
      <div className="flex flex-col lg:flex-row gap-16 flex-1">
        
        {/* Left Panel: Inputs */}
        <div className="lg:w-1/3 flex flex-col justify-between">
          <form onSubmit={addTask} className="space-y-10">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest opacity-50 block">Nouvelle Mission</label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Qu'y a-t-il à faire ?"
                className="input-minimal w-full"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest opacity-50 block">Rappel (Optionnel)</label>
              <input 
                type="datetime-local" 
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="input-minimal w-full text-base"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-black text-white py-5 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors active:scale-[0.98]"
            >
              Ajouter à la liste
            </button>
          </form>

          {/* Shortcuts panel at bottom left */}
          <div className="mt-16 pt-8 border-t border-zinc-200">
            <h3 className="text-[10px] uppercase font-bold tracking-widest mb-6 opacity-30">Guide Typographique</h3>
            <ul className="space-y-4">
              <li className="flex items-center text-xs opacity-60">
                <span className="shortcut-badge">Entrée</span> Ajouter la tâche
              </li>
              <li className="flex items-center text-xs opacity-60">
                <span className="shortcut-badge">Ctrl + D</span> Tout supprimer
              </li>
              <li className="flex items-center text-xs opacity-60">
                <span className="shortcut-badge">Ctrl + E</span> Édi. Sélection
              </li>
            </ul>
          </div>
        </div>

        {/* Right Panel: List Content */}
        <div className="lg:w-2/3 lg:border-l border-zinc-100 lg:pl-16">
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key="empty"
                className="h-full min-h-[300px] flex items-center justify-center border border-dashed border-zinc-200"
              >
                <p className="font-serif italic text-3xl opacity-20">Aucune tâche en cours...</p>
              </motion.div>
            ) : (
              <motion.div 
                key="grid"
                className="task-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AnimatePresence initial={false}>
                  {tasks.map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`h-[140px] p-6 flex flex-col justify-between group transition-colors bg-[#fcfcfc] hover:bg-[#f5f5f5] relative ${
                        isOverdue(task) ? 'bg-[#fff1f1] hover:bg-[#ffeaea]' : ''
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[9px] uppercase tracking-tighter opacity-40 font-medium font-sans">
                            {formatDate(task.createdAt)}
                          </span>
                          {task.reminderTime && (
                            <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                              isOverdue(task) ? 'text-red-600' : 'opacity-40'
                            }`}>
                              <Clock className="w-2.5 h-2.5" />
                              {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(task.reminderTime)}
                            </span>
                          )}
                        </div>
                        <p className={`text-xl font-medium leading-[1.2] font-sans truncate ${task.completed ? 'line-through text-zinc-300' : ''}`}>
                          {task.text}
                        </p>
                      </div>

                      <div className="flex justify-between items-end border-t border-black/5 pt-3">
                        <div className="flex gap-4">
                          <button 
                            onClick={() => startEditing(task)}
                            className="text-[10px] font-bold uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
                          >
                            Éditer
                          </button>
                          <button 
                            onClick={() => deleteTask(task.id)}
                            className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:underline decoration-2 underline-offset-4"
                          >
                            Supprimer
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => toggleComplete(task.id)}
                          className={`p-1 transition-all ${task.completed ? 'text-emerald-500' : 'text-zinc-200 hover:text-emerald-500'}`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      <footer className="mt-20 pt-8 border-t border-zinc-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] opacity-20">
        <span>Editorial To-Do System</span>
        <span>© 2026 Collection No. 1</span>
        <span>Priorité & Style</span>
      </footer>
    </div>
  );
}
