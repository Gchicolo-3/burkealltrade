import React, { useState, useEffect, useRef } from 'react';
import { Home, Briefcase, Users, Calendar, Sparkles, Settings, Phone, Mail, MapPin, Plus, X, Camera, FileText, MessageSquare, Sunrise, ClipboardList, DollarSign, Clock, CheckCircle2, AlertCircle, ChevronRight, Search, Loader2, Copy, Send, Image as ImageIcon, Trash2, Edit3, Menu, Wrench, Zap, Hammer, Droplet, Paintbrush, Package, ArrowRight, Star, TrendingUp, Printer, Smartphone, CreditCard, Mic, MicOff } from 'lucide-react';

export default function AllTradeCommand() {
  // ============ STATE ============
  const [view, setView] = useState('today');
  const [aiView, setAiView] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [stageTransition, setStageTransition] = useState(null); // { jobId, newStage }
  const [showAddJob, setShowAddJob] = useState(false);
  const [printQuote, setPrintQuote] = useState(null); // string content for print modal
  
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('alltrade_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      businessName: 'Burke AllTrade Services',
      ownerName: 'Mike',
      phone: '201-749-1531',
      email: 'mike@burkealltradehandyman.com',
      hourlyRate: 95,
      serviceArea: 'Bergen County, NJ',
      minimumHours: 2
    };
  });

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('alltrade_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('alltrade_customers');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 1, name: 'Maria Hernandez', phone: '201-555-0142', email: 'maria.h@gmail.com', address: '14 Oak St, Hillsdale NJ', tags: ['repeat'], notes: 'Prefers morning appointments. Two dogs.', created: '2025-08-12' },
      { id: 2, name: 'Tom & Linda Walsh', phone: '201-555-0188', email: 'twalsh@yahoo.com', address: '22 Maple Ave, Westwood NJ', tags: ['VIP', 'repeat'], notes: 'Big colonial. Lots of trim work needs.', created: '2024-11-03' },
      { id: 3, name: 'Greenleaf Realty', phone: '201-555-0211', email: 'jen@greenleafnj.com', address: '105 Kinderkamack Rd, Park Ridge NJ', tags: ['commercial'], notes: 'Property mgmt. Recurring punch list work.', created: '2025-02-19' },
      { id: 4, name: 'Dave Kim', phone: '201-555-0177', email: 'davekim88@gmail.com', address: '9 Birch Ln, Montvale NJ', tags: [], notes: '', created: '2026-04-18' }
    ];
  });

  const [jobs, setJobs] = useState(() => {
    try {
      const saved = localStorage.getItem('alltrade_jobs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 1, customerId: 1, title: 'Replace 3 interior doors', stage: 'scheduled', value: 850, scheduledDate: '2026-04-25', notes: 'Customer ordered doors. Just install.', services: ['carpentry'], created: '2026-04-20' },
      { id: 2, customerId: 2, title: 'Crown molding entire first floor', stage: 'quoted', value: 4200, scheduledDate: null, notes: 'Sent quote 4/22. Waiting on approval.', services: ['carpentry'], created: '2026-04-22' },
      { id: 3, customerId: 3, title: 'Punch list - 4 units', stage: 'in_progress', value: 1850, scheduledDate: '2026-04-23', notes: 'Day 2 of 3. Paint touch-ups remaining.', services: ['painting', 'general'], created: '2026-04-15' },
      { id: 4, customerId: 4, title: 'Leaky bathroom faucet', stage: 'lead', value: 0, scheduledDate: null, notes: 'Texted photo. Need to quote.', services: ['plumbing'], created: '2026-04-23' },
      { id: 5, customerId: 1, title: 'Fence gate repair', stage: 'done', value: 320, scheduledDate: '2026-04-15', notes: 'Done. Sent invoice.', services: ['carpentry'], created: '2026-04-10' },
      { id: 6, customerId: 2, title: 'Replace bathroom vanity', stage: 'paid', value: 1450, scheduledDate: '2026-04-08', paymentMethod: 'Zelle', paymentDate: '2026-04-09', notes: 'Paid via Zelle 4/9.', services: ['plumbing', 'carpentry'], created: '2026-04-01' }
    ];
  });

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    try { localStorage.setItem('alltrade_customers', JSON.stringify(customers)); } catch (e) {}
  }, [customers]);

  useEffect(() => {
    try { localStorage.setItem('alltrade_jobs', JSON.stringify(jobs)); } catch (e) {}
  }, [jobs]);

  useEffect(() => {
    try { localStorage.setItem('alltrade_settings', JSON.stringify(settings)); } catch (e) {}
  }, [settings]);

  useEffect(() => {
    if (apiKey) {
      try { localStorage.setItem('alltrade_api_key', apiKey); } catch (e) {}
    }
  }, [apiKey]);

  // ============ DERIVED ============
  const today = new Date().toISOString().split('T')[0];
  const todayJobs = jobs.filter(j => j.scheduledDate === today);
  const overdueQuotes = jobs.filter(j => {
    if (j.stage !== 'quoted') return false;
    const diffDays = Math.floor((new Date(today) - new Date(j.created)) / (1000 * 60 * 60 * 24));
    return diffDays >= 2;
  });
  const unpaidValue = jobs.filter(j => j.stage === 'done').reduce((s, j) => s + j.value, 0);
  const pipelineValue = jobs.filter(j => ['lead', 'quoted', 'scheduled', 'in_progress'].includes(j.stage)).reduce((s, j) => s + j.value, 0);
  const monthRevenue = jobs.filter(j => j.stage === 'paid').reduce((s, j) => s + j.value, 0);
  
  // Conversion: of jobs that were quoted (now in any stage past quoted), how many became scheduled+
  const quotedOrPast = jobs.filter(j => ['quoted', 'scheduled', 'in_progress', 'done', 'paid'].includes(j.stage));
  const wonFromQuoted = jobs.filter(j => ['scheduled', 'in_progress', 'done', 'paid'].includes(j.stage));
  const conversionRate = quotedOrPast.length > 0 ? Math.round((wonFromQuoted.length / quotedOrPast.length) * 100) : 0;

  const getCustomer = (id) => customers.find(c => c.id === id);

  // ============ AI HELPER ============
  const callClaude = async (messages, system, maxTokens = 1500) => {
    if (!apiKey) throw new Error('Add your Anthropic API key in Settings to use AI features.');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, system, messages })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API call failed');
    }
    const data = await response.json();
    return data.content[0].text;
  };

  // ============ STAGE CONFIG ============
  const stages = [
    { id: 'lead', label: 'Lead', color: 'bg-stone-200 text-stone-800 border-stone-400' },
    { id: 'quoted', label: 'Quoted', color: 'bg-blue-100 text-blue-900 border-blue-400' },
    { id: 'scheduled', label: 'Scheduled', color: 'bg-amber-100 text-amber-900 border-amber-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-orange-200 text-orange-900 border-orange-500' },
    { id: 'done', label: 'Done', color: 'bg-emerald-100 text-emerald-900 border-emerald-500' },
    { id: 'paid', label: 'Paid', color: 'bg-green-200 text-green-900 border-green-600' }
  ];

  const serviceIcons = { carpentry: Hammer, electrical: Zap, plumbing: Droplet, painting: Paintbrush, general: Wrench, assembly: Package };

  const navItems = [
    { id: 'today', label: 'Today', icon: Home },
    { id: 'pipeline', label: 'Pipeline', icon: Briefcase },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'calendar', label: 'Schedule', icon: Calendar },
    { id: 'ai', label: 'AI Tools', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // ============ STAGE TRANSITION HANDLER ============
  // For stages that need extra info, open transition modal
  // For others, move directly
  const requestStageMove = (jobId, newStage) => {
    const stagesNeedingInput = ['scheduled', 'quoted', 'paid'];
    if (stagesNeedingInput.includes(newStage)) {
      setStageTransition({ jobId, newStage });
    } else {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, stage: newStage } : j));
    }
  };

  // ============ VOICE INPUT (Web Speech API) ============
  const VoiceInput = ({ value, onChange, placeholder, accent = 'amber', height = 'h-64' }) => {
    const [isListening, setIsListening] = useState(false);
    const [supported, setSupported] = useState(false);
    const [error, setError] = useState('');
    const recognitionRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setSupported(false); return; }
      setSupported(true);
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;
      return () => { try { recognitionRef.current?.stop(); } catch(e) {} };
    }, []);

    const toggle = () => {
      const rec = recognitionRef.current;
      if (!rec) return;
      if (isListening) { rec.stop(); setIsListening(false); return; }

      rec.onresult = (event) => {
        let newText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) newText += event.results[i][0].transcript;
        }
        if (newText && textareaRef.current) {
          const currentVal = textareaRef.current.value;
          onChange((currentVal + (currentVal && !currentVal.endsWith(' ') ? ' ' : '') + newText.trim()));
        }
      };
      rec.onerror = (e) => {
        setError(e.error === 'not-allowed' ? 'Microphone permission denied. Enable in browser settings.' : `Voice error: ${e.error}`);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);

      setError('');
      try { rec.start(); setIsListening(true); }
      catch (e) { setError('Could not start recording. Try again.'); }
    };

    const focusClass = {
      amber: 'focus:border-amber-500', blue: 'focus:border-blue-500',
      purple: 'focus:border-purple-500', emerald: 'focus:border-emerald-500'
    }[accent] || 'focus:border-amber-500';

    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full p-4 pr-4 border-2 border-stone-200 outline-none text-sm ${focusClass} ${height}`}
        />
        {supported && (
          <button
            onClick={toggle}
            className={`absolute top-3 right-3 px-3 py-2 transition-all flex items-center gap-2 shadow-md ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-stone-900 text-white hover:bg-amber-500 hover:text-stone-900'
            }`}
            title={isListening ? 'Stop' : 'Tap to talk'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span className="text-xs font-bold uppercase tracking-wider">{isListening ? 'Stop' : 'Talk'}</span>
          </button>
        )}
        {isListening && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            Listening
          </div>
        )}
        {error && <div className="text-xs text-red-700 mt-1 bg-red-50 p-2 border-l-2 border-red-500">{error}</div>}
        {!supported && (
          <div className="text-xs text-stone-500 mt-1 italic">Voice input works in Chrome and Safari. Type to use this field.</div>
        )}
      </div>
    );
  };

  // ============ COMPONENTS ============
  const StageBadge = ({ stage }) => {
    const s = stages.find(x => x.id === stage);
    return <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold uppercase tracking-wider border ${s.color}`}>{s.label}</span>;
  };

  const JobCard = ({ job, onClick }) => {
    const customer = getCustomer(job.customerId);
    return (
      <button onClick={onClick} className="w-full text-left bg-white border-2 border-stone-200 hover:border-amber-500 transition-all p-4 group">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-stone-900 text-sm leading-tight group-hover:text-amber-700">{job.title}</h3>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 flex-shrink-0 mt-0.5" />
        </div>
        <p className="text-xs text-stone-600 mb-2">{customer?.name}</p>
        <div className="flex items-center justify-between text-xs">
          <div className="flex gap-1">
            {job.services.map(s => {
              const Icon = serviceIcons[s] || Wrench;
              return <Icon key={s} className="w-3.5 h-3.5 text-stone-500" />;
            })}
          </div>
          {job.value > 0 && <span className="font-mono font-bold text-stone-900">${job.value.toLocaleString()}</span>}
        </div>
        {job.scheduledDate && (
          <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-1 text-xs text-stone-600">
            <Calendar className="w-3 h-3" />
            {new Date(job.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        )}
      </button>
    );
  };

  const StatCard = ({ label, value, sublabel, icon: Icon, accent }) => (
    <div className={`bg-white border-l-4 ${accent} border-t border-r border-b border-stone-200 p-5`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{label}</span>
        <Icon className="w-5 h-5 text-stone-400" />
      </div>
      <div className="text-3xl font-black text-stone-900 font-mono">{value}</div>
      {sublabel && <div className="text-xs text-stone-500 mt-1">{sublabel}</div>}
    </div>
  );

  // ============ STAGE TRANSITION MODAL ============
  const StageTransitionModal = () => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Zelle');
    const [paymentDate, setPaymentDate] = useState(today);
    const [notes, setNotes] = useState('');

    useEffect(() => {
      if (stageTransition) {
        const job = jobs.find(j => j.id === stageTransition.jobId);
        setDate(job?.scheduledDate || '');
        setTime('09:00');
        setAmount(job?.value > 0 ? String(job.value) : '');
        setPaymentMethod('Zelle');
        setPaymentDate(today);
        setNotes('');
      }
    }, [stageTransition?.jobId]);

    if (!stageTransition) return null;
    const job = jobs.find(j => j.id === stageTransition.jobId);
    if (!job) return null;
    const customer = getCustomer(job.customerId);
    const newStage = stageTransition.newStage;

    const confirm = () => {
      let updates = { stage: newStage };
      if (newStage === 'scheduled') {
        if (!date) return;
        updates.scheduledDate = date;
        updates.scheduledTime = time;
      }
      if (newStage === 'quoted') {
        if (!amount) return;
        updates.value = parseFloat(amount);
      }
      if (newStage === 'paid') {
        updates.paymentMethod = paymentMethod;
        updates.paymentDate = paymentDate;
        if (notes) updates.notes = (job.notes || '') + (job.notes ? '\n' : '') + `Paid via ${paymentMethod} on ${paymentDate}. ${notes}`;
      }
      setJobs(jobs.map(j => j.id === job.id ? { ...j, ...updates } : j));
      setStageTransition(null);
    };

    const config = {
      scheduled: { color: 'amber', icon: Calendar, title: 'Schedule this job', subtitle: 'Pick a date and the job auto-populates in your Schedule view.' },
      quoted: { color: 'blue', icon: FileText, title: 'Lock in the quote', subtitle: 'Enter the amount you sent the customer.' },
      paid: { color: 'green', icon: CheckCircle2, title: 'Mark as paid', subtitle: 'How did they pay? When?' }
    };
    const c = config[newStage];

    return (
      <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setStageTransition(null)}>
        <div className="bg-white w-full md:max-w-md" onClick={e => e.stopPropagation()}>
          <div className={`p-6 border-b-4 border-${c.color}-500`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <c.icon className={`w-6 h-6 text-${c.color}-600`} />
                <div>
                  <h2 className="text-xl font-black text-stone-900">{c.title}</h2>
                  <p className="text-sm text-stone-600 mt-0.5">{c.subtitle}</p>
                </div>
              </div>
              <button onClick={() => setStageTransition(null)} className="text-stone-500 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-stone-100 p-3 mt-3">
              <div className="font-bold text-stone-900 text-sm">{job.title}</div>
              <div className="text-xs text-stone-600 mt-0.5">{customer?.name} · {customer?.address}</div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {newStage === 'scheduled' && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Date <span className="text-red-600">*</span></label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border-2 border-stone-200 focus:border-amber-500 outline-none font-mono text-base" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Time</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-3 border-2 border-stone-200 focus:border-amber-500 outline-none font-mono text-base" />
                </div>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-xs text-amber-900">
                  This will appear in your Today view and Schedule. Add to Google Calendar after saving.
                </div>
              </>
            )}

            {newStage === 'quoted' && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Quote amount <span className="text-red-600">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-mono text-xl">$</span>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full p-3 pl-9 border-2 border-stone-200 focus:border-blue-500 outline-none font-mono text-xl font-bold" />
                  </div>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 text-xs text-blue-900">
                  Quotes more than 2 days old auto-flag on your dashboard so you remember to follow up.
                </div>
              </>
            )}

            {newStage === 'paid' && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Payment method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'Check', 'Zelle', 'Venmo', 'Card', 'Other'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)} className={`px-3 py-2 text-sm font-bold border-2 ${paymentMethod === m ? 'bg-green-500 text-white border-green-500' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Payment date</label>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-3 border-2 border-stone-200 focus:border-green-500 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Payment notes (optional)</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Check #, transaction ID, etc." className="w-full p-3 border-2 border-stone-200 focus:border-green-500 outline-none text-sm" />
                </div>
                <div className="bg-green-50 border-l-4 border-green-500 p-3 text-xs text-green-900">
                  ${job.value.toLocaleString()} will be added to your paid revenue.
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStageTransition(null)} className="flex-1 py-3 font-bold text-stone-700 border-2 border-stone-200 hover:bg-stone-100">Cancel</button>
              <button onClick={confirm} disabled={(newStage === 'scheduled' && !date) || (newStage === 'quoted' && !amount)} className={`flex-1 py-3 font-bold text-white bg-stone-900 hover:bg-${c.color}-500 disabled:opacity-40 disabled:cursor-not-allowed`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ QUICK ADD JOB MODAL ============
  const AddJobModal = () => {
    const [title, setTitle] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [services, setServices] = useState([]);
    const [notes, setNotes] = useState('');

    if (!showAddJob) return null;

    const save = () => {
      if (!title || !customerId) return;
      const newJob = {
        id: Math.max(...jobs.map(j => j.id)) + 1,
        customerId: parseInt(customerId),
        title,
        stage: 'lead',
        value: 0,
        scheduledDate: null,
        notes,
        services: services.length > 0 ? services : ['general'],
        created: today
      };
      setJobs([...jobs, newJob]);
      setShowAddJob(false);
    };

    const toggleService = (s) => {
      setServices(services.includes(s) ? services.filter(x => x !== s) : [...services, s]);
    };

    return (
      <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowAddJob(false)}>
        <div className="bg-white w-full md:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b-2 border-stone-200 flex items-center justify-between">
            <h2 className="text-2xl font-black text-stone-900">New Job</h2>
            <button onClick={() => setShowAddJob(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Job title <span className="text-red-600">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Replace 3 interior doors" className="w-full p-3 border-2 border-stone-200 focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Customer <span className="text-red-600">*</span></label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-3 border-2 border-stone-200 focus:border-amber-500 outline-none bg-white">
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Services</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(serviceIcons).map(s => {
                  const Icon = serviceIcons[s];
                  return (
                    <button key={s} onClick={() => toggleService(s)} className={`px-3 py-2 text-xs font-bold border-2 capitalize flex flex-col items-center gap-1 ${services.includes(s) ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200'}`}>
                      <Icon className="w-4 h-4" />
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything important..." className="w-full h-20 p-3 border-2 border-stone-200 focus:border-amber-500 outline-none text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAddJob(false)} className="flex-1 py-3 font-bold text-stone-700 border-2 border-stone-200 hover:bg-stone-100">Cancel</button>
              <button onClick={save} disabled={!title || !customerId} className="flex-1 py-3 font-bold text-white bg-stone-900 hover:bg-amber-500 hover:text-stone-900 disabled:opacity-40">
                Add to pipeline
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ PRINT QUOTE MODAL ============
  const PrintQuoteModal = () => {
    if (!printQuote) return null;
    const printIt = () => {
      const win = window.open('', '_blank');
      win.document.write(`
        <html><head><title>Quote - ${settings.businessName}</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; color: #1c1917; }
          h1 { font-size: 32px; margin: 0; color: #d97706; }
          .header { border-bottom: 4px solid #d97706; padding-bottom: 20px; margin-bottom: 30px; }
          .meta { color: #57534e; font-size: 14px; margin-top: 8px; }
          pre { font-family: ui-monospace, monospace; white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #d6d3d1; font-size: 12px; color: #78716c; }
        </style></head><body>
        <div class="header">
          <h1>${settings.businessName}</h1>
          <div class="meta">${settings.phone} · ${settings.email}</div>
          <div class="meta">${settings.serviceArea}</div>
        </div>
        <pre>${printQuote.replace(/</g, '&lt;')}</pre>
        <div class="footer">
          Quote prepared by ${settings.ownerName}. Valid for 30 days. Licensed and insured.
        </div>
        </body></html>
      `);
      win.document.close();
      setTimeout(() => win.print(), 250);
    };

    return (
      <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPrintQuote(null)}>
        <div className="bg-white max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
          <h3 className="text-xl font-black mb-4">Print quote</h3>
          <p className="text-sm text-stone-600 mb-4">Opens a print-ready version with your business letterhead.</p>
          <div className="flex gap-2">
            <button onClick={() => setPrintQuote(null)} className="flex-1 py-3 font-bold text-stone-700 border-2 border-stone-200">Cancel</button>
            <button onClick={printIt} className="flex-1 py-3 font-bold text-white bg-stone-900 hover:bg-amber-500 hover:text-stone-900 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============ TODAY VIEW ============
  const TodayView = () => (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-1">{new Date(today).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">Good morning, {settings.ownerName}.</h1>
        </div>
        <button onClick={() => setShowAddJob(true)} className="bg-stone-900 text-white px-4 py-2.5 font-bold text-sm hover:bg-amber-500 hover:text-stone-900 transition-colors flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" /> Quick add
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Today" value={todayJobs.length} sublabel="jobs scheduled" icon={Calendar} accent="border-l-amber-500" />
        <StatCard label="Pipeline" value={`$${(pipelineValue/1000).toFixed(1)}k`} sublabel="active value" icon={TrendingUp} accent="border-l-blue-500" />
        <StatCard label="Unpaid" value={`$${unpaidValue.toLocaleString()}`} sublabel="awaiting payment" icon={DollarSign} accent="border-l-orange-500" />
        <StatCard label="Paid MTD" value={`$${monthRevenue.toLocaleString()}`} sublabel="revenue" icon={CheckCircle2} accent="border-l-emerald-500" />
        <StatCard label="Win rate" value={`${conversionRate}%`} sublabel="quotes won" icon={Star} accent="border-l-purple-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            Today's jobs
          </h2>
          <div className="space-y-2">
            {todayJobs.length === 0 ? (
              <div className="bg-stone-50 border-2 border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
                Nothing scheduled today. Time to drum up work.
              </div>
            ) : todayJobs.map(j => <JobCard key={j.id} job={j} onClick={() => {}} />)}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Needs attention
          </h2>
          <div className="space-y-2">
            {overdueQuotes.length > 0 && (
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
                <div className="font-bold text-orange-900 text-sm mb-1">{overdueQuotes.length} quote{overdueQuotes.length > 1 ? 's' : ''} pending follow-up</div>
                <div className="text-xs text-orange-800">Sent more than 2 days ago. Time to nudge.</div>
                <button onClick={() => { setView('ai'); setAiView('message'); }} className="mt-2 text-xs font-bold text-orange-900 underline">Draft a follow-up</button>
              </div>
            )}
            {jobs.filter(j => j.stage === 'lead').length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <div className="font-bold text-blue-900 text-sm mb-1">{jobs.filter(j => j.stage === 'lead').length} new lead{jobs.filter(j => j.stage === 'lead').length > 1 ? 's' : ''} waiting</div>
                <div className="text-xs text-blue-800">Quote them today. Speed wins jobs.</div>
                <button onClick={() => { setView('ai'); setAiView('quote'); }} className="mt-2 text-xs font-bold text-blue-900 underline">Build a quote with AI</button>
              </div>
            )}
            {unpaidValue > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                <div className="font-bold text-amber-900 text-sm mb-1">${unpaidValue.toLocaleString()} unpaid</div>
                <div className="text-xs text-amber-800">Send reminders before it gets old.</div>
                <button onClick={() => { setView('ai'); setAiView('message'); }} className="mt-2 text-xs font-bold text-amber-900 underline">Draft reminder</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-stone-900 text-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">AI Daily Brief</p>
            <h3 className="text-xl font-bold mb-2">Get your morning launch.</h3>
            <p className="text-sm text-stone-300">A 30-second briefing on what matters most today.</p>
          </div>
          <button onClick={() => { setView('ai'); setAiView('brief'); }} className="bg-amber-500 text-stone-900 px-4 py-2 font-bold text-sm hover:bg-amber-400 transition-colors flex items-center gap-2 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
            Run brief
          </button>
        </div>
      </div>
    </div>
  );

  // ============ PIPELINE VIEW ============
  const PipelineView = () => {
    const [selectedJob, setSelectedJob] = useState(null);

    const handleStageChange = (jobId, newStage) => {
      setSelectedJob(null);
      requestStageMove(jobId, newStage);
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-black text-stone-900 tracking-tight">Pipeline</h1>
            <p className="text-sm text-stone-600 mt-1">Total active value: <span className="font-mono font-bold text-stone-900">${pipelineValue.toLocaleString()}</span></p>
          </div>
          <button onClick={() => setShowAddJob(true)} className="bg-stone-900 text-white px-4 py-2.5 font-bold text-sm hover:bg-amber-500 hover:text-stone-900 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> New job
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 overflow-x-auto">
          {stages.map(stage => {
            const stageJobs = jobs.filter(j => j.stage === stage.id);
            const stageValue = stageJobs.reduce((sum, j) => sum + j.value, 0);
            return (
              <div key={stage.id} className="min-w-[260px]">
                <div className={`px-3 py-2 mb-2 ${stage.color} border-2 flex items-center justify-between`}>
                  <span className="font-black uppercase tracking-wider text-xs">{stage.label}</span>
                  <span className="font-mono font-bold text-xs">{stageJobs.length}</span>
                </div>
                {stageValue > 0 && <div className="text-xs text-stone-500 mb-2 px-1 font-mono">${stageValue.toLocaleString()}</div>}
                <div className="space-y-2">
                  {stageJobs.map(j => <JobCard key={j.id} job={j} onClick={() => setSelectedJob(j)} />)}
                  {stageJobs.length === 0 && <div className="border-2 border-dashed border-stone-200 p-6 text-center text-xs text-stone-400">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>

        {selectedJob && (
          <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSelectedJob(null)}>
            <div className="bg-white w-full md:max-w-lg md:max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b-2 border-stone-200">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <StageBadge stage={selectedJob.stage} />
                  <button onClick={() => setSelectedJob(null)}><X className="w-5 h-5" /></button>
                </div>
                <h2 className="text-2xl font-black text-stone-900 mb-1">{selectedJob.title}</h2>
                <p className="text-sm text-stone-600">{getCustomer(selectedJob.customerId)?.name}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedJob.value > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-1">Value</div>
                      <div className="font-mono font-black text-2xl text-stone-900">${selectedJob.value.toLocaleString()}</div>
                    </div>
                  )}
                  {selectedJob.scheduledDate && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-1">Scheduled</div>
                      <div className="font-bold text-stone-900">{new Date(selectedJob.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                      {selectedJob.scheduledTime && <div className="text-xs text-stone-500 font-mono">{selectedJob.scheduledTime}</div>}
                    </div>
                  )}
                  {selectedJob.paymentMethod && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-1">Paid via</div>
                      <div className="font-bold text-stone-900">{selectedJob.paymentMethod}</div>
                      <div className="text-xs text-stone-500">{selectedJob.paymentDate}</div>
                    </div>
                  )}
                </div>
                {selectedJob.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-1">Notes</div>
                    <div className="text-sm text-stone-700 bg-stone-50 p-3 border-l-2 border-stone-300 whitespace-pre-wrap">{selectedJob.notes}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-2">Move to stage</div>
                  <div className="grid grid-cols-2 gap-2">
                    {stages.filter(s => s.id !== selectedJob.stage).map(s => (
                      <button key={s.id} onClick={() => handleStageChange(selectedJob.id, s.id)} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-colors ${s.color}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============ CUSTOMERS VIEW ============
  const CustomersView = () => {
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.address.toLowerCase().includes(search.toLowerCase()));

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">Customers</h1>
          <button className="bg-stone-900 text-white px-4 py-2.5 font-bold text-sm hover:bg-amber-500 hover:text-stone-900 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or town..." className="w-full pl-10 pr-4 py-3 border-2 border-stone-200 focus:border-stone-900 outline-none font-medium" />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(c => {
            const customerJobs = jobs.filter(j => j.customerId === c.id);
            const totalValue = customerJobs.filter(j => j.stage === 'paid').reduce((s, j) => s + j.value, 0);
            return (
              <button key={c.id} onClick={() => setSelectedCustomer(c)} className="text-left bg-white border-2 border-stone-200 hover:border-amber-500 p-4 transition-colors group">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-stone-900 group-hover:text-amber-700">{c.name}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{c.address}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {c.tags.map(t => <span key={t} className={`text-xs font-bold px-2 py-0.5 ${t === 'VIP' ? 'bg-amber-200 text-amber-900' : t === 'commercial' ? 'bg-blue-200 text-blue-900' : 'bg-stone-200 text-stone-700'}`}>{t}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-600 mt-3 pt-3 border-t border-stone-100">
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {customerJobs.length} jobs</span>
                  {totalValue > 0 && <span className="flex items-center gap-1 font-mono font-bold text-stone-900"><DollarSign className="w-3 h-3" /> {totalValue.toLocaleString()}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {selectedCustomer && (
          <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSelectedCustomer(null)}>
            <div className="bg-white w-full md:max-w-lg md:max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b-2 border-stone-200">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-2xl font-black text-stone-900">{selectedCustomer.name}</h2>
                  <button onClick={() => setSelectedCustomer(null)}><X className="w-5 h-5" /></button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedCustomer.tags.map(t => <span key={t} className={`text-xs font-bold px-2 py-0.5 ${t === 'VIP' ? 'bg-amber-200 text-amber-900' : t === 'commercial' ? 'bg-blue-200 text-blue-900' : 'bg-stone-200 text-stone-700'}`}>{t}</span>)}
                </div>
              </div>
              <div className="p-6 space-y-3">
                <a href={`tel:${selectedCustomer.phone}`} className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-amber-50 transition-colors">
                  <Phone className="w-4 h-4 text-stone-600" />
                  <span className="font-mono font-bold">{selectedCustomer.phone}</span>
                </a>
                <a href={`mailto:${selectedCustomer.email}`} className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-amber-50 transition-colors">
                  <Mail className="w-4 h-4 text-stone-600" />
                  <span className="text-sm">{selectedCustomer.email}</span>
                </a>
                <div className="flex items-center gap-3 p-3 bg-stone-50">
                  <MapPin className="w-4 h-4 text-stone-600" />
                  <span className="text-sm">{selectedCustomer.address}</span>
                </div>
                {selectedCustomer.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-1">Notes</div>
                    <div className="text-sm text-stone-700 bg-stone-50 p-3 border-l-2 border-stone-300">{selectedCustomer.notes}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-2">Job history</div>
                  <div className="space-y-2">
                    {jobs.filter(j => j.customerId === selectedCustomer.id).map(j => (
                      <div key={j.id} className="flex items-center justify-between p-3 bg-stone-50 text-sm">
                        <div>
                          <div className="font-bold text-stone-900">{j.title}</div>
                          <div className="text-xs text-stone-500">{j.scheduledDate || 'Not scheduled'}</div>
                        </div>
                        <StageBadge stage={j.stage} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============ CALENDAR VIEW ============
  const CalendarView = () => {
    const scheduled = jobs.filter(j => j.scheduledDate).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    const grouped = scheduled.reduce((acc, j) => { acc[j.scheduledDate] = acc[j.scheduledDate] || []; acc[j.scheduledDate].push(j); return acc; }, {});

    return (
      <div>
        <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-6">Schedule</h1>
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayJobs]) => {
            const d = new Date(date);
            const isToday = date === today;
            return (
              <div key={date}>
                <div className={`flex items-baseline gap-3 mb-3 pb-2 border-b-2 ${isToday ? 'border-amber-500' : 'border-stone-200'}`}>
                  <div className={`text-3xl font-black ${isToday ? 'text-amber-600' : 'text-stone-900'} font-mono`}>{d.getDate()}</div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-stone-500">{d.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    <div className="text-sm font-bold text-stone-900">{d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                  </div>
                  {isToday && <span className="ml-auto text-xs font-black uppercase tracking-widest text-amber-600">Today</span>}
                </div>
                <div className="space-y-2">
                  {dayJobs.map(j => (
                    <div key={j.id} className="flex items-center gap-3">
                      {j.scheduledTime && <div className="font-mono text-xs font-bold text-stone-500 w-16 flex-shrink-0">{j.scheduledTime}</div>}
                      <div className="flex-1"><JobCard job={j} onClick={() => {}} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============ AI TOOLS VIEW ============
  const AIToolsView = () => {
    const tools = [
      { id: 'quote', label: 'AI Quote Builder', icon: FileText, desc: 'Paste a job description, get an itemized quote in seconds.', color: 'border-amber-500 hover:bg-amber-50' },
      { id: 'photo', label: 'AI Photo Analyzer', icon: Camera, desc: 'Upload a photo of the problem, get scope, materials, and a price estimate.', color: 'border-blue-500 hover:bg-blue-50' },
      { id: 'message', label: 'AI Message Composer', icon: MessageSquare, desc: 'Draft texts and emails in your voice. Follow-ups, reminders, thank-yous.', color: 'border-emerald-500 hover:bg-emerald-50' },
      { id: 'brief', label: 'Daily Brief', icon: Sunrise, desc: 'A 30-second morning briefing on what matters today.', color: 'border-orange-500 hover:bg-orange-50' },
      { id: 'notes', label: 'Job Notes Cleaner', icon: ClipboardList, desc: 'Talk it through, get clean structured notes back.', color: 'border-purple-500 hover:bg-purple-50' }
    ];

    if (aiView === 'quote') return <AIQuoteBuilder onBack={() => setAiView(null)} />;
    if (aiView === 'photo') return <AIPhotoAnalyzer onBack={() => setAiView(null)} />;
    if (aiView === 'message') return <AIMessageComposer onBack={() => setAiView(null)} />;
    if (aiView === 'brief') return <AIDailyBrief onBack={() => setAiView(null)} />;
    if (aiView === 'notes') return <AINotesCleaner onBack={() => setAiView(null)} />;

    return (
      <div>
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Powered by Claude
          </p>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">AI Tools</h1>
          <p className="text-stone-600 mt-2">Save 5 to 10 hours a week. Quote faster, follow up sharper, never let a lead go cold.</p>
        </div>

        {!apiKey && (
          <div className="bg-amber-100 border-l-4 border-amber-500 p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 text-sm">Add your Anthropic API key to use these tools</div>
              <button onClick={() => setView('settings')} className="text-xs font-bold text-amber-900 underline mt-1">Go to Settings</button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {tools.map(t => (
            <button key={t.id} onClick={() => setAiView(t.id)} className={`bg-white border-2 border-stone-200 ${t.color} p-6 text-left transition-all group`}>
              <div className="flex items-start justify-between mb-3">
                <t.icon className="w-8 h-8 text-stone-700 group-hover:text-stone-900" />
                <ArrowRight className="w-5 h-5 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-black text-lg text-stone-900 mb-1">{t.label}</h3>
              <p className="text-sm text-stone-600">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ============ AI: QUOTE BUILDER (with Send/Print) ============
  const AIQuoteBuilder = ({ onBack }) => {
    const [description, setDescription] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');

    const generate = async () => {
      if (!description.trim()) return;
      setLoading(true); setError(''); setResult('');
      try {
        const text = await callClaude(
          [{ role: 'user', content: `Job description from customer:\n\n"${description}"\n\nGenerate an itemized quote.` }],
          `You are a quote builder for ${settings.businessName}, a handyman serving ${settings.serviceArea}. Owner is ${settings.ownerName}. Hourly rate is $${settings.hourlyRate}/hr with a ${settings.minimumHours}-hour minimum.

Generate an itemized quote in this exact format:

JOB SCOPE
[2-3 sentence summary of what you're going to do]

LINE ITEMS
- [Task 1] ......... $XXX
- [Task 2] ......... $XXX
- Materials ........ $XXX
- Labor (X hrs @ $${settings.hourlyRate}/hr) ... $XXX

ESTIMATED TOTAL: $XXXX

TIMING
[How long the job will take and any scheduling notes]

NOTES
[Any caveats, things customer should know, what's not included]

Be realistic with pricing for handyman work in NJ. Don't over-explain. Tradesman voice, direct.`
        );
        setResult(text);
      } catch (e) { setError(e.message); }
      setLoading(false);
    };

    const sendSMS = () => {
      if (!recipientPhone) { alert('Add a phone number first'); return; }
      const cleaned = recipientPhone.replace(/\D/g, '');
      const body = encodeURIComponent(`Hey, here's the quote we discussed:\n\n${result}\n\nLet me know if you have questions.\n${settings.ownerName}`);
      window.location.href = `sms:${cleaned}?&body=${body}`;
    };

    const sendEmail = () => {
      if (!recipientEmail) { alert('Add an email first'); return; }
      const subject = encodeURIComponent(`Quote from ${settings.businessName}`);
      const body = encodeURIComponent(`${result}\n\n--\n${settings.ownerName}\n${settings.businessName}\n${settings.phone}`);
      window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    };

    return (
      <div>
        <button onClick={onBack} className="text-sm font-bold text-stone-600 hover:text-stone-900 mb-4 flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to AI Tools
        </button>
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-amber-600" />
          <h1 className="text-3xl font-black text-stone-900">AI Quote Builder</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Job description</label>
            <VoiceInput
              value={description}
              onChange={setDescription}
              placeholder="Tap Talk and dictate what the customer told you, or paste their text. Example: 'My kitchen faucet is leaking under the sink and the cabinet floor is starting to warp...'"
              accent="amber"
              height="h-64"
            />
            <button onClick={generate} disabled={loading || !description.trim()} className="mt-3 w-full bg-stone-900 text-white py-3 font-bold hover:bg-amber-500 hover:text-stone-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Building quote...</> : <><Sparkles className="w-4 h-4" /> Generate Quote</>}
            </button>
            {error && <div className="mt-2 text-sm text-red-700 bg-red-50 p-3 border-l-4 border-red-500">{error}</div>}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Generated quote</label>
            <div className="border-2 border-stone-200 bg-stone-50 p-4 h-64 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {result || <span className="text-stone-400">Quote will appear here...</span>}
            </div>
            
            {result && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result)} className="bg-stone-200 text-stone-900 py-2.5 font-bold hover:bg-stone-300 flex items-center justify-center gap-2 text-sm">
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                  <button onClick={() => setPrintQuote(result)} className="bg-stone-200 text-stone-900 py-2.5 font-bold hover:bg-stone-300 flex items-center justify-center gap-2 text-sm">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 pt-2 border-t-2 border-stone-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Send to customer</p>
                  <div className="flex gap-2">
                    <input type="tel" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="Phone" className="flex-1 p-2 border-2 border-stone-200 text-sm" />
                    <button onClick={sendSMS} className="bg-amber-500 text-stone-900 px-4 py-2 font-bold hover:bg-amber-400 flex items-center gap-1 text-sm">
                      <Smartphone className="w-4 h-4" /> Text
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Email" className="flex-1 p-2 border-2 border-stone-200 text-sm" />
                    <button onClick={sendEmail} className="bg-stone-900 text-white px-4 py-2 font-bold hover:bg-amber-500 hover:text-stone-900 flex items-center gap-1 text-sm">
                      <Send className="w-4 h-4" /> Email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============ AI: PHOTO ANALYZER ============
  const AIPhotoAnalyzer = ({ onBack }) => {
    const [image, setImage] = useState(null);
    const [imageData, setImageData] = useState(null);
    const [context, setContext] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target.result);
        setImageData({ data: ev.target.result.split(',')[1], mediaType: file.type });
      };
      reader.readAsDataURL(file);
    };

    const analyze = async () => {
      if (!imageData) return;
      setLoading(true); setError(''); setResult('');
      try {
        const text = await callClaude(
          [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: imageData.mediaType, data: imageData.data } },
            { type: 'text', text: `${context ? 'Customer context: ' + context + '\n\n' : ''}Analyze this photo and tell me what I'm looking at as a handyman.` }
          ]}],
          `You are an experienced handyman analyzing job photos for ${settings.businessName} in ${settings.serviceArea}. Hourly rate is $${settings.hourlyRate}/hr.

Respond in this format:

WHAT I SEE
[What's the problem? Be specific]

SCOPE OF WORK
[What needs to be done, plain language]

MATERIALS NEEDED
[Bullet list of likely materials]

ESTIMATED TIME
[Realistic time estimate]

PRICE ESTIMATE
[Range, e.g. "$250 to $400" with what could push it higher or lower]

QUESTIONS TO ASK
[2-3 questions for the customer]

Tradesman voice. Honest. No fluff.`,
          2000
        );
        setResult(text);
      } catch (e) { setError(e.message); }
      setLoading(false);
    };

    return (
      <div>
        <button onClick={onBack} className="text-sm font-bold text-stone-600 hover:text-stone-900 mb-4 flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to AI Tools
        </button>
        <div className="flex items-center gap-3 mb-6">
          <Camera className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-black text-stone-900">AI Photo Analyzer</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Job photo</label>
            {!image ? (
              <label className="border-2 border-dashed border-stone-300 hover:border-blue-500 hover:bg-blue-50 transition-colors p-12 flex flex-col items-center justify-center cursor-pointer h-64">
                <ImageIcon className="w-12 h-12 text-stone-400 mb-3" />
                <span className="font-bold text-stone-700">Tap to upload photo</span>
                <span className="text-xs text-stone-500 mt-1">From customer text or take one yourself</span>
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
            ) : (
              <div className="relative">
                <img src={image} alt="Job" className="w-full h-64 object-cover border-2 border-stone-200" />
                <button onClick={() => { setImage(null); setImageData(null); setResult(''); }} className="absolute top-2 right-2 bg-stone-900 text-white p-1.5 hover:bg-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="mt-3">
              <VoiceInput
                value={context}
                onChange={setContext}
                placeholder="Optional: dictate or type customer context, what they said..."
                accent="blue"
                height="h-24"
              />
            </div>
            <button onClick={analyze} disabled={loading || !imageData} className="mt-3 w-full bg-stone-900 text-white py-3 font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Analyze photo</>}
            </button>
            {error && <div className="mt-2 text-sm text-red-700 bg-red-50 p-3 border-l-4 border-red-500">{error}</div>}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Analysis</label>
            <div className="border-2 border-stone-200 bg-stone-50 p-4 h-[28rem] overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {result || <span className="text-stone-400">Analysis will appear here...</span>}
            </div>
            {result && (
              <button onClick={() => navigator.clipboard.writeText(result)} className="mt-3 w-full bg-stone-200 text-stone-900 py-3 font-bold hover:bg-stone-300 flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" /> Copy analysis
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============ AI: MESSAGE COMPOSER ============
  const AIMessageComposer = ({ onBack }) => {
    const [messageType, setMessageType] = useState('follow-up');
    const [context, setContext] = useState('');
    const [tone, setTone] = useState('friendly');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const types = [
      { id: 'follow-up', label: 'Quote follow-up' },
      { id: 'thank-you', label: 'Thank you note' },
      { id: 'reminder', label: 'Payment reminder' },
      { id: 'review-request', label: 'Review request' },
      { id: 'confirm', label: 'Appointment confirm' },
      { id: 'reschedule', label: 'Reschedule' }
    ];

    const generate = async () => {
      setLoading(true); setError(''); setResult('');
      try {
        const text = await callClaude(
          [{ role: 'user', content: `Message type: ${types.find(t => t.id === messageType).label}\nTone: ${tone}\nContext: ${context}\n\nDraft this as a text message.` }],
          `You write text messages for ${settings.ownerName}, a handyman in ${settings.serviceArea}. ${settings.businessName}.

Voice rules:
- Sounds like a real person, not corporate
- Short. Texts not paragraphs
- Direct, casual, warm
- Never use "Hope you're doing well" or "Just checking in"
- Never use "circling back" or "touching base"
- No emojis unless tone is super casual
- Sign as ${settings.ownerName}

Output ONLY the message text. No preamble, no explanation.`
        );
        setResult(text);
      } catch (e) { setError(e.message); }
      setLoading(false);
    };

    return (
      <div>
        <button onClick={onBack} className="text-sm font-bold text-stone-600 hover:text-stone-900 mb-4 flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to AI Tools
        </button>
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-8 h-8 text-emerald-600" />
          <h1 className="text-3xl font-black text-stone-900">AI Message Composer</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Message type</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {types.map(t => (
                <button key={t.id} onClick={() => setMessageType(t.id)} className={`px-3 py-2 text-sm font-bold border-2 transition-colors ${messageType === t.id ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Tone</label>
            <div className="flex gap-2 mb-4">
              {['friendly', 'professional', 'firm'].map(t => (
                <button key={t} onClick={() => setTone(t)} className={`px-4 py-2 text-sm font-bold border-2 capitalize ${tone === t ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-stone-700 border-stone-200'}`}>
                  {t}
                </button>
              ))}
            </div>

            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Context</label>
            <VoiceInput
              value={context}
              onChange={setContext}
              placeholder="Tap Talk or type. Customer name, what the job was, dates, amounts, anything specific..."
              accent="emerald"
              height="h-32"
            />
            <button onClick={generate} disabled={loading || !context.trim()} className="mt-3 w-full bg-stone-900 text-white py-3 font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Drafting...</> : <><Sparkles className="w-4 h-4" /> Draft message</>}
            </button>
            {error && <div className="mt-2 text-sm text-red-700 bg-red-50 p-3 border-l-4 border-red-500">{error}</div>}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Draft</label>
            <div className="border-2 border-stone-200 bg-white p-4 h-64 overflow-y-auto text-sm whitespace-pre-wrap shadow-inner">
              {result || <span className="text-stone-400">Message will appear here...</span>}
            </div>
            {result && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => navigator.clipboard.writeText(result)} className="bg-stone-200 text-stone-900 py-3 font-bold hover:bg-stone-300 flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button onClick={generate} className="bg-stone-900 text-white py-3 font-bold hover:bg-emerald-500 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============ AI: DAILY BRIEF ============
  const AIDailyBrief = ({ onBack }) => {
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generate = async () => {
      setLoading(true); setError(''); setResult('');
      try {
        const summary = {
          today: todayJobs.map(j => ({ title: j.title, customer: getCustomer(j.customerId)?.name, value: j.value, address: getCustomer(j.customerId)?.address })),
          overdueQuotes: overdueQuotes.map(j => ({ title: j.title, customer: getCustomer(j.customerId)?.name, value: j.value, daysSent: Math.floor((new Date(today) - new Date(j.created)) / (1000 * 60 * 60 * 24)) })),
          newLeads: jobs.filter(j => j.stage === 'lead').map(j => ({ title: j.title, customer: getCustomer(j.customerId)?.name })),
          unpaidValue, pipelineValue
        };
        const text = await callClaude(
          [{ role: 'user', content: `Here's the data for today:\n${JSON.stringify(summary, null, 2)}\n\nGive me my morning brief.` }],
          `You are giving ${settings.ownerName} a 30-second morning briefing. He's a busy handyman. Be direct and practical.

Format:

TODAY
[1-2 sentences on what's happening today, in order]

DO THIS FIRST
[The single most important thing to do this morning, with reasoning]

DON'T FORGET
[1-3 bullet items that need attention]

NUMBER TO HIT
[A realistic revenue or activity goal for today]

Tradesman voice. No fluff. No corporate speak. Sign off with a one-line motivator that doesn't sound like a fortune cookie.`
        );
        setResult(text);
      } catch (e) { setError(e.message); }
      setLoading(false);
    };

    useEffect(() => { if (apiKey && !result && !loading) generate(); }, []);

    return (
      <div>
        <button onClick={onBack} className="text-sm font-bold text-stone-600 hover:text-stone-900 mb-4 flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to AI Tools
        </button>
        <div className="flex items-center gap-3 mb-6">
          <Sunrise className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-black text-stone-900">Daily Brief</h1>
        </div>

        <div className="bg-stone-900 text-white p-8">
          {loading && <div className="flex items-center gap-3 text-amber-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="font-bold">Reading your pipeline...</span></div>}
          {error && <div className="text-red-300 bg-red-950 p-4 border-l-4 border-red-500">{error}</div>}
          {result && <div className="font-mono text-sm whitespace-pre-wrap text-stone-100 leading-relaxed">{result}</div>}
          {!loading && !result && !error && (
            <button onClick={generate} className="bg-amber-500 text-stone-900 px-6 py-3 font-bold hover:bg-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Run my brief
            </button>
          )}
        </div>

        {result && (
          <button onClick={generate} className="mt-4 text-sm font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> Regenerate
          </button>
        )}
      </div>
    );
  };

  // ============ AI: NOTES CLEANER ============
  const AINotesCleaner = ({ onBack }) => {
    const [raw, setRaw] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generate = async () => {
      if (!raw.trim()) return;
      setLoading(true); setError(''); setResult('');
      try {
        const text = await callClaude(
          [{ role: 'user', content: `Raw job notes:\n\n${raw}\n\nClean these up.` }],
          `You take messy job site notes and turn them into clean, structured records for ${settings.businessName}.

Format:

CUSTOMER: [name if mentioned, else "Unknown"]
DATE: [today's date or what's mentioned]
JOB: [1 line summary]

WORK COMPLETED
- [bullet of each thing done]

MATERIALS USED
- [bullet of each material with quantity if mentioned]

TIME ON SITE: [hours]

FOLLOW-UP NEEDED
- [anything that needs to happen next, or "None"]

NOTES FOR FILE
[anything customer said, conditions, things to remember]

Keep it tight. Don't invent details that weren't there.`
        );
        setResult(text);
      } catch (e) { setError(e.message); }
      setLoading(false);
    };

    return (
      <div>
        <button onClick={onBack} className="text-sm font-bold text-stone-600 hover:text-stone-900 mb-4 flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to AI Tools
        </button>
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-black text-stone-900">Job Notes Cleaner</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Brain dump</label>
            <VoiceInput
              value={raw}
              onChange={setRaw}
              placeholder="Tap Talk and dictate, or just type. Doesn't have to be neat. Example: 'maria hillsdale done with doors took 4 hrs used 6 shims and 12 hinges customer wants estimate on shutters next month also fence post broken on right side'"
              accent="purple"
              height="h-64"
            />
            <button onClick={generate} disabled={loading || !raw.trim()} className="mt-3 w-full bg-stone-900 text-white py-3 font-bold hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Cleaning...</> : <><Sparkles className="w-4 h-4" /> Structure my notes</>}
            </button>
            {error && <div className="mt-2 text-sm text-red-700 bg-red-50 p-3 border-l-4 border-red-500">{error}</div>}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Clean record</label>
            <div className="border-2 border-stone-200 bg-stone-50 p-4 h-64 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {result || <span className="text-stone-400">Structured notes will appear here...</span>}
            </div>
            {result && (
              <button onClick={() => navigator.clipboard.writeText(result)} className="mt-3 w-full bg-stone-200 text-stone-900 py-3 font-bold hover:bg-stone-300 flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" /> Copy notes
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============ SETTINGS VIEW ============
  const SettingsView = () => (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-6">Settings</h1>

      <div className="bg-white border-2 border-stone-200 p-6 mb-6">
        <h2 className="text-lg font-black text-stone-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-600" /> Anthropic API Key
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          To use the AI tools, paste your Anthropic API key. Get one at <span className="font-mono text-amber-700">console.anthropic.com</span>. Your key stays in this browser.
        </p>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-..." className="w-full p-3 border-2 border-stone-200 focus:border-amber-500 outline-none font-mono text-sm" />
        {apiKey && (
          <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 p-3 border-l-4 border-emerald-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> API key set. AI tools are live.
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-stone-200 p-6 mb-6">
        <h2 className="text-lg font-black text-stone-900 mb-4">Business Info</h2>
        <div className="space-y-4">
          {[
            { key: 'businessName', label: 'Business name' },
            { key: 'ownerName', label: 'Your name' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'serviceArea', label: 'Service area' }
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">{f.label}</label>
              <input type="text" value={settings[f.key]} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })} className="w-full p-3 border-2 border-stone-200 focus:border-stone-900 outline-none" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">Hourly rate</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-mono">$</span>
                <input type="number" value={settings.hourlyRate} onChange={e => setSettings({ ...settings, hourlyRate: parseFloat(e.target.value) || 0 })} className="w-full p-3 pl-7 border-2 border-stone-200 focus:border-stone-900 outline-none font-mono" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">Minimum hours</label>
              <input type="number" value={settings.minimumHours} onChange={e => setSettings({ ...settings, minimumHours: parseFloat(e.target.value) || 0 })} className="w-full p-3 border-2 border-stone-200 focus:border-stone-900 outline-none font-mono" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-stone-900 text-white p-6">
        <h2 className="text-lg font-black mb-2 text-amber-400">Built by Chicolo Consultative CoLab</h2>
        <p className="text-sm text-stone-300">AllTrade Command v1.2. Built for you, by your boy.</p>
      </div>
    </div>
  );

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-stone-50 font-sans" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap');
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        body { font-family: 'DM Sans', system-ui, sans-serif; }
      `}</style>

      <header className="bg-stone-900 text-white border-b-4 border-amber-500 sticky top-0 z-40">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="md:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-stone-900" strokeWidth={3} />
              </div>
              <div>
                <div className="font-black text-sm tracking-tight" style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '0.05em' }}>ALLTRADE COMMAND</div>
                <div className="text-xs text-stone-400 -mt-0.5">{settings.businessName}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="hidden sm:inline">All systems go</span>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex w-56 bg-stone-900 text-white min-h-[calc(100vh-65px)] flex-col">
          <nav className="flex-1 py-4">
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setView(item.id); setAiView(null); }} className={`w-full px-6 py-3 flex items-center gap-3 text-sm font-bold uppercase tracking-wider transition-colors border-l-4 ${view === item.id ? 'bg-stone-800 text-amber-400 border-amber-500' : 'text-stone-400 hover:text-white border-transparent hover:bg-stone-800'}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-stone-800 text-xs text-stone-500">
            <div className="font-mono">v1.2 · CoLab</div>
          </div>
        </aside>

        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-stone-900/90" onClick={() => setMobileNavOpen(false)}>
            <div className="bg-stone-900 text-white w-64 h-full" onClick={e => e.stopPropagation()}>
              <nav className="py-4">
                {navItems.map(item => (
                  <button key={item.id} onClick={() => { setView(item.id); setAiView(null); setMobileNavOpen(false); }} className={`w-full px-6 py-4 flex items-center gap-3 text-sm font-bold uppercase tracking-wider border-l-4 ${view === item.id ? 'bg-stone-800 text-amber-400 border-amber-500' : 'text-stone-400 border-transparent'}`}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-full overflow-x-hidden">
          {view === 'today' && <TodayView />}
          {view === 'pipeline' && <PipelineView />}
          {view === 'customers' && <CustomersView />}
          {view === 'calendar' && <CalendarView />}
          {view === 'ai' && <AIToolsView />}
          {view === 'settings' && <SettingsView />}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-900 border-t-2 border-amber-500 z-40">
        <div className="grid grid-cols-5">
          {navItems.filter(n => n.id !== 'settings').map(item => (
            <button key={item.id} onClick={() => { setView(item.id); setAiView(null); }} className={`py-3 flex flex-col items-center gap-1 transition-colors ${view === item.id ? 'text-amber-400' : 'text-stone-400'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      <StageTransitionModal />
      <AddJobModal />
      <PrintQuoteModal />
    </div>
  );
}
