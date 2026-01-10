'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Expert {
  _id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  bio: string;
  skills: { name: string; level: string; yearsExp: number }[];
  linkedIn?: string;
  github?: string;
  availability: {
    timezone: string;
    hoursPerWeek: number;
    status: 'available' | 'busy' | 'unavailable';
  };
}

interface ExpertMatch {
  expert: Expert;
  matchScore: number;
  reasoning: string[];
  matchedBy: string;
}

interface AgentMessage {
  agent: string;
  message: string;
  timestamp: string;
}

interface SearchResult {
  queryId: string;
  matches: ExpertMatch[];
  conversation: AgentMessage[];
}

const ExecutionPipeline = ({ loading, conversation, mode }: { loading: boolean; conversation: AgentMessage[]; mode: 'search' | 'document' }) => {
  const searchSteps = [
    { name: 'Fireworks AI', icon: '🎆', label: 'Intent Analysis', active: true },
    { name: 'Voyage AI', icon: '🌌', label: 'Vector Embedding', active: true },
    { name: 'MongoDB Atlas', icon: '🍃', label: 'Vector Search', active: true },
    { name: 'Fireworks AI', icon: '🤖', label: 'Agent Collab', active: true },
    { name: 'ExpertMesh', icon: '💎', label: 'Decision Layer', active: true },
  ];

  const documentSteps = [
    { name: 'pdf-parse', icon: '📄', label: 'Text Extraction', active: true },
    { name: 'Fireworks AI', icon: '🧠', label: 'Entity Synthesis', active: true },
    { name: 'Fireworks AI', icon: '✍️', label: 'Profile Design', active: true },
    { name: 'Voyage AI', icon: '🌌', label: 'Vector Seeding', active: true },
    { name: 'MongoDB Atlas', icon: '🍃', label: 'Persistence', active: true },
  ];

  const steps = mode === 'search' ? searchSteps : documentSteps;

  const agentIcons: Record<string, string> = {
    orchestrator: '🤖',
    analyst: '🔍',
    scout: '🔎',
    verifier: '✅',
    recommender: '⭐',
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-12 bg-gray-900/80 backdrop-blur-md rounded-3xl border border-gray-700/50 p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left: Tools & Pipeline */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              {mode === 'search' ? 'Discovery Pipeline' : 'Extraction Pipeline'}
            </h3>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
              {mode === 'search' ? 'RAG ARCHITECTURE v2.1' : 'SYNTHETIC GEN v1.0'}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {steps.map((step, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border bg-gray-800/50 border-gray-600/50 transition-all duration-500 hover:border-blue-500/30"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <span className="text-xl">{step.icon}</span>
                  <div>
                    <div className="text-white font-bold text-[10px]">{step.name}</div>
                    <div className="text-[9px] text-gray-400 font-mono leading-none mt-1">{step.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center animate-spin-slow">
                    <span className="text-white text-[10px]">⚡</span>
                  </div>
                  <div className="text-[11px] font-medium text-blue-100">
                    {mode === 'search' ? 'Vector Search Active' : 'Synthesizing Profiles'}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-purple-600/10 rounded-2xl border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="text-white text-[10px]">🧠</span>
                  </div>
                  <div className="text-[11px] font-medium text-purple-100">
                    {mode === 'search' ? 'VoyageEmbedding v2' : 'AI Reasoning Active'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Agent Collaboration Terminal */}
        <div className="w-full md:w-96 space-y-4">
          <div className="bg-black/40 rounded-2xl border border-gray-800 p-5 h-[280px] overflow-hidden relative">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
              <span className="text-[10px] text-green-500 font-mono uppercase tracking-widest">
                {mode === 'search' ? 'agent_search.log' : 'expert_synthesis.log'}
              </span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[200px] scrollbar-hide pr-2">
              <AnimatePresence mode="popLayout">
                {conversation.length === 0 && (
                  <motion.div
                    key="handshake"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-600 text-xs font-mono"
                  >
                    Establishing agent handshake...
                  </motion.div>
                )}
                {conversation.map((msg, i) => (
                  <motion.div
                    key={`msg-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2"
                  >
                    <span className="text-xs mt-1 shrink-0">{agentIcons[msg.agent] || '🤖'}</span>
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono uppercase">[{msg.agent}]</span>
                      <p className="text-[11px] text-gray-300 font-mono leading-relaxed">{msg.message}</p>
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2"
                  >
                    <span className="animate-pulse text-xs text-blue-500">●</span>
                    <span className="text-[11px] text-blue-500 font-mono animate-pulse italic">Thinking...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [mode, setMode] = useState<'search' | 'document'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [liveConversation, setLiveConversation] = useState<AgentMessage[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [selectedExperts, setSelectedExperts] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const router = useRouter();

  // Load selected experts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedExperts');
    if (saved) {
      try {
        setSelectedExperts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse selected experts');
      }
    }
  }, []);

  // Save selected experts to localStorage
  useEffect(() => {
    localStorage.setItem('selectedExperts', JSON.stringify(selectedExperts));
  }, [selectedExperts]);

  const toggleExpertSelection = (expertId: string) => {
    setSelectedExperts(prev =>
      prev.includes(expertId)
        ? prev.filter(id => id !== expertId)
        : [...prev, expertId]
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setResult(null);
    setLiveConversation([]);

    try {
      console.log('🚀 Initiating search for:', searchQuery);
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();
      console.log('📦 Search result data:', data);

      if (data.success) {
        setResult(data);
        setLiveConversation(data.conversation || []);
      } else {
        console.error('❌ Search failed:', data.error);
        alert(`Search failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🔥 Search runtime error:', error);
      alert('Search failed. Please check your connection to MongoDB.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const response = await fetch('/api/seed', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSeeded(true);
      }
    } catch (error) {
      console.error('Seed error:', error);
    } finally {
      setSeeding(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!file) return;

    setIngesting(true);
    setResult(null);
    setLiveConversation([{
      agent: 'orchestrator',
      message: `Analyzing document: ${file.name}...`,
      timestamp: new Date().toISOString()
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ingest/document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setResult(data);
        setLiveConversation([
          {
            agent: 'orchestrator',
            message: `Ingestion complete! Extracted ${data.matches?.length || 0} synthetic experts.`,
            timestamp: new Date().toISOString()
          }
        ]);
        setMode('search'); // Switch to results view
      } else {
        alert(`Ingestion failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Ingestion error:', error);
      alert('Failed to process document');
    } finally {
      setIngesting(false);
      setFile(null);
    }
  };
  const handleImportGitHub = async () => {
    setImporting(true);
    setImportStatus('Importing developers from GitHub...');
    try {
      const response = await fetch('/api/ingest/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languages: ['Python', 'TypeScript', 'JavaScript', 'Go', 'Rust'],
          minFollowers: 500,
          limitPerLanguage: 3,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setImportStatus(`✓ Imported ${data.imported} developers from GitHub`);
      } else {
        setImportStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const agentColors: Record<string, string> = {
    orchestrator: 'text-purple-400',
    analyst: 'text-blue-400',
    scout: 'text-green-400',
    verifier: 'text-yellow-400',
    recommender: 'text-pink-400',
  };

  const agentIcons: Record<string, string> = {
    orchestrator: '🤖',
    analyst: '🔍',
    scout: '🔎',
    verifier: '✅',
    recommender: '⭐',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              EM
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ExpertMesh</h1>
              <p className="text-xs text-gray-400">Multi-Agent Expert Discovery</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">MongoDB + Voyage AI + Fireworks AI</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/meshboard')}
              className={`px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg transition-all flex items-center gap-2 ${selectedExperts.length > 0
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-blue-500/20'
                : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                }`}
            >
              <span>Go to Meshboard</span>
              {selectedExperts.length > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                  {selectedExperts.length}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-700 flex gap-2">
            <button
              onClick={() => {
                setMode('search');
                setResult(null);
              }}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${mode === 'search'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
            >
              <span>🔍</span> Discovery Mode
            </button>
            <button
              onClick={() => {
                setMode('document');
                setResult(null);
              }}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${mode === 'document'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
            >
              <span>📄</span> Extraction Mode
            </button>
          </div>
        </div>

        {/* Dynamic Content based on Mode */}
        <div className="max-w-4xl mx-auto mb-16">
          {mode === 'search' ? (
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
                Find the Perfect Expert
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
                Describe what you need in natural language. Our multi-agent system will analyze your requirements
                and find the best matches from our expert pool.
              </p>

              <div className="max-w-3xl mx-auto">
                <div className="flex gap-4 p-2 bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl focus-within:border-blue-500/50 transition-all shadow-2xl">
                  <input
                    key="search-query-field"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g., Lead React developer with healthcare security experience"
                    className="flex-1 px-6 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading || !searchQuery.trim()}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin text-lg">⚙️</span>
                      </span>
                    ) : (
                      'Search experts'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
                Extract Experts from Docs
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
                Upload project briefs, team rosters, or CVs. Our AI will automatically parse the document,
                generate expert profiles, and add them to your database.
              </p>

              <div className="max-w-2xl mx-auto">
                <div className="relative group">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.txt,.md"
                    disabled={ingesting}
                  />
                  <div className={`p-12 border-2 border-dashed rounded-3xl transition-all duration-500 bg-gray-800/30 flex flex-col items-center justify-center gap-4 ${file ? 'border-green-500/50 bg-green-500/5' : 'border-gray-700 group-hover:border-blue-500/50 group-hover:bg-blue-500/5'
                    }`}>
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-2 transition-all duration-500 ${file ? 'bg-green-500 shadow-lg shadow-green-500/20 rotate-0' : 'bg-gray-800 text-gray-500 group-hover:text-blue-400 group-hover:-rotate-3'
                      }`}>
                      {file ? '📄' : '📤'}
                    </div>
                    {file ? (
                      <div className="animate-in fade-in slide-in-from-bottom-2">
                        <h3 className="text-xl font-bold text-white mb-1">{file.name}</h3>
                        <p className="text-sm text-green-400 font-medium">Ready for AI extraction</p>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Drop document here</h3>
                        <p className="text-sm text-gray-500">PDF, Text, or Markdown (Max 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {file && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleDocumentUpload}
                    disabled={ingesting}
                    className="mt-8 w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-2xl font-bold text-white shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 overflow-hidden group"
                  >
                    {ingesting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>AI Analyzing Document...</span>
                      </>
                    ) : (
                      <>
                        <span>Extract Experts</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Pipeline Animation */}
        <AnimatePresence mode="wait">
          {(loading || ingesting) && (
            <motion.div
              key="pipeline-loading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="py-12"
            >
              <ExecutionPipeline
                loading={loading || ingesting}
                conversation={liveConversation}
                mode={ingesting ? 'document' : 'search'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-3 gap-8"
            >
              {/* Agent Collaboration Panel */}
              <div className="lg:col-span-1">
                <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    🤝 Agent Collaboration
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                      Live
                    </span>
                  </h3>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {(result.conversation || []).map((msg, i) => (
                      <motion.div
                        key={`result-msg-${i}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-gray-900/50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span>{agentIcons[msg.agent] || '🤖'}</span>
                          <span className={`font-medium capitalize ${agentColors[msg.agent] || 'text-white'}`}>
                            {msg.agent}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">{msg.message}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expert Results */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    Top Matches ({result.matches.length})
                  </h3>
                  <span className="text-sm text-gray-400">Query ID: {result.queryId}</span>
                </div>

                <div className="space-y-4">
                  {result.matches.map((match, i) => (
                    <motion.div
                      key={match?.expert?._id || `match-${i}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 hover:border-blue-500/50 transition-colors relative"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-xl font-semibold text-white">{match.expert.name}</h4>
                          <p className="text-blue-400">{match.expert.title}</p>
                          <p className="text-gray-400 text-sm">{match.expert.department}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-400">
                            {(match.matchScore * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-400">Match Score</div>
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm mb-4">{match.expert.bio}</p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {match.expert.skills.slice(0, 5).map((skill, j) => (
                          <span
                            key={j}
                            className="px-3 py-1 bg-gray-700/50 rounded-full text-sm text-gray-300"
                          >
                            {skill.name}
                            <span className="text-gray-500 ml-1">({skill.yearsExp}y)</span>
                          </span>
                        ))}
                      </div>

                      {/* Reasoning */}
                      <div className="border-t border-gray-700 pt-4">
                        <h5 className="text-sm font-medium text-gray-400 mb-2">Why this match?</h5>
                        <div className="space-y-1">
                          {match.reasoning.map((reason, j) => (
                            <p key={j} className="text-sm text-gray-300">{reason}</p>
                          ))}
                        </div>
                      </div>

                      {/* Availability */}
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700">
                        <span className={`px-2 py-1 rounded-full text-xs ${match.expert.availability.status === 'available'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                          {match.expert.availability.status}
                        </span>
                        <span className="text-sm text-gray-400">
                          {match.expert.availability.timezone} · {match.expert.availability.hoursPerWeek}h/week
                        </span>
                        {match.expert.linkedIn && (
                          <a href={match.expert.linkedIn} className="text-blue-400 text-sm hover:underline">
                            LinkedIn
                          </a>
                        )}
                        {match.expert.github && (
                          <a href={match.expert.github} className="text-gray-400 text-sm hover:underline">
                            GitHub
                          </a>
                        )}
                      </div>

                      {/* Droplet Selection Button */}
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleExpertSelection(match?.expert?._id || '')}
                        className={`absolute bottom-4 right-4 z-20 group transition-all duration-300 ${selectedExperts.includes(match?.expert?._id || '')
                          ? 'text-green-500 drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                          : 'text-gray-600 hover:text-green-400'
                          }`}
                        title={selectedExperts.includes(match?.expert?._id || '') ? "Remove from MeshBoard" : "Add to MeshBoard"}
                      >
                        <div className="relative">
                          <svg className="w-8 h-8 filter drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.5C12 2.5 6.5 9.5 6.5 13.5C6.5 16.5 8.96 19 12 19C15.04 19 17.5 16.5 17.5 13.5C17.5 9.5 12 2.5 12 2.5Z" />
                          </svg>
                          {selectedExperts.includes(match?.expert?._id || '') && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1 -right-1 bg-white rounded-full p-1 border-2 border-green-500 shadow-sm"
                            >
                              <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                              </svg>
                            </motion.div>
                          )}
                          <div className="absolute -bottom-8 right-0 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest pointer-events-none">
                            {selectedExperts.includes(match?.expert?._id || '') ? "On Board" : "Add to Mesh"}
                          </div>
                        </div>
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !loading && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">Start Your Search</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Enter a natural language query above to find experts. Our AI agents will collaborate
              to find the best matches for your needs.
            </p>

            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-3">Try these example queries:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'Find a security expert with healthcare compliance',
                  'React developer who can lead a team',
                  'ML engineer with NLP experience',
                  'Kubernetes expert available in EST timezone',
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setSearchQuery(example)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
