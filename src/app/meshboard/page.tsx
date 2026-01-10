'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Expert {
    _id: string;
    name: string;
    title: string;
    department: string;
    bio: string;
    skills: { name: string; level: string; yearsExp: number }[];
    renownLevel?: string;
}

interface Project {
    id: string;
    name: string;
    description: string;
    goals: string;
    objectives: string;
    x: number;
    y: number;
    assignedExpertIds: string[];
}

interface PlacedExpert extends Expert {
    x: number;
    y: number;
    projectId?: string; // Which project it belongs to
}

export default function MeshBoard() {
    const [experts, setExperts] = useState<Expert[]>([]);
    const [placedExperts, setPlacedExperts] = useState<PlacedExpert[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '', goals: '', objectives: '' });
    const [aiInsight, setAiInsight] = useState('');
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [zoomScale, setZoomScale] = useState(1);

    const [loading, setLoading] = useState(true);
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [assistantMsg, setAssistantMsg] = useState('Welcome to your MeshBoard Whiteboard. Drag your allies from the pool on the left onto this workspace to begin organizing your team.');
    const [isClient, setIsClient] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        setIsClient(true);
        const savedPlaced = localStorage.getItem('placedExperts');
        const savedProjects = localStorage.getItem('whiteboardProjects');
        if (savedPlaced) {
            try {
                setPlacedExperts(JSON.parse(savedPlaced));
            } catch (e) {
                console.error('Failed to load placed experts');
            }
        }
        if (savedProjects) {
            try {
                setProjects(JSON.parse(savedProjects));
            } catch (e) {
                console.error('Failed to load projects');
            }
        }

        const fetchExperts = async () => {
            const savedIds = JSON.parse(localStorage.getItem('selectedExperts') || '[]');
            if (savedIds.length === 0) {
                setExperts([]);
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/experts?ids=${savedIds.join(',')}`);
                const data = await response.json();
                if (data.success) {
                    setExperts(data.experts);
                }
            } catch (error) {
                console.error('Failed to fetch experts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchExperts();
    }, []);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem('placedExperts', JSON.stringify(placedExperts));
            localStorage.setItem('whiteboardProjects', JSON.stringify(projects));
        }
    }, [placedExperts, projects, isClient]);

    const handleDragEnd = (event: any, info: any, expert: Expert) => {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        const x = (info.point.x - canvasRect.left) / zoomScale;
        const y = (info.point.y - canvasRect.top) / zoomScale;

        // If dropped on the canvas area
        if (info.point.x > 320) {
            // Check for project collision
            const collidedProject = projects.find(p => {
                const projectX = p.x;
                const projectY = p.y;
                // Projects are now 320x220
                return x > projectX && x < projectX + 320 && y > projectY && y < projectY + 220;
            });

            setPlacedExperts(prev => {
                const existing = prev.find(p => p._id === expert._id);
                if (existing) {
                    return prev.map(p => p._id === expert._id ? { ...p, x, y, projectId: collidedProject?.id } : p);
                }
                return [...prev, { ...expert, x, y, projectId: collidedProject?.id }];
            });

            if (collidedProject) {
                setAssistantMsg(`${expert.name} has been assigned to ${collidedProject.name}. Strategic alignment confirmed!`);
                setAssistantOpen(true);
            }
        }
    };

    const createProject = () => {
        if (!newProject.name) return;
        const project: Project = {
            id: Math.random().toString(36).substr(2, 9),
            ...newProject,
            x: 100 + projects.length * 50,
            y: 100 + projects.length * 50,
            assignedExpertIds: []
        };
        setProjects([...projects, project]);
        setNewProject({ name: '', description: '', goals: '', objectives: '' });
        setIsProjectModalOpen(false);
    };

    const handleAIAdvice = async () => {
        setAssistantMsg('Analyzing your whiteboard strategy... 🤖');
        setAssistantOpen(true);

        try {
            const response = await fetch('/api/meshboard/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    experts: placedExperts,
                    projects: projects.length > 0 ? projects : [{ name: "General Workspace", description: "Currently unassigned talent pool." }]
                }),
            });
            const data = await response.json();
            if (data.success) {
                setAssistantMsg(data.advice);
            } else {
                setAssistantMsg('The AI advisor is having trouble reading the board.');
            }
        } catch (error) {
            setAssistantMsg('Assistant offline.');
        }
    };

    const removeFromBoard = (id: string) => {
        setPlacedExperts(prev => prev.filter(p => p._id !== id));
    };

    const fetchProjectInsight = async (project: Project) => {
        setLoadingInsight(true);
        setSelectedProject(project);
        setIsDetailModalOpen(true);

        const projectExperts = placedExperts.filter(e => e.projectId === project.id);

        try {
            const response = await fetch('/api/meshboard/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    experts: projectExperts,
                    projects: [project]
                }),
            });
            const data = await response.json();
            if (data.success) {
                setAiInsight(data.advice);
            }
        } catch (error) {
            setAiInsight('Could not generate team synergy insights at this time.');
        } finally {
            setLoadingInsight(false);
        }
    };

    if (loading || !isClient) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin text-4xl text-green-500">💧</div>
            </div>
        );
    }

    const unplacedExperts = experts.filter(e => !placedExperts.find(p => p._id === e._id));

    return (
        <div className="h-screen w-screen overflow-hidden bg-[#f8f9fa] flex flex-col font-sans text-gray-900">
            {/* Header */}
            <header className="h-16 border-b border-gray-200 bg-white shadow-sm flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => router.push('/')}
                    >
                        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-lg group-hover:bg-green-600 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.5C12 2.5 6.5 9.5 6.5 13.5C6.5 16.5 8.96 19 12 19C15.04 19 17.5 16.5 17.5 13.5C17.5 9.5 12 2.5 12 2.5Z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">MeshBoard</h1>
                            <p className="text-[10px] text-gray-400 -mt-1 font-mono uppercase">Strategic_Whiteboard_v2</p>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-gray-200 mx-2" />
                    <nav className="flex gap-4">
                        <button className="text-sm font-medium text-green-600 border-b-2 border-green-500 pb-1">Collaborative Canvas</button>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsProjectModalOpen(true)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-600 transition-all shadow-md"
                    >
                        <span>+ New Project</span>
                    </button>
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-gray-${i * 200} flex items-center justify-center text-xs font-bold text-gray-500`}>
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleAIAdvice}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black transition-all shadow-md"
                    >
                        <span>🤖 AI Advisor</span>
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="text-sm font-bold text-gray-500 hover:text-gray-800"
                    >
                        Exit
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar: The Pool */}
                <aside className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 z-40 shadow-xl">
                    <div className="p-6 border-b border-gray-100 bg-[#fafafa]">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Expert Pool</h3>
                        <p className="text-[10px] text-gray-500">Drag allies onto the canvas to assign them.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        <AnimatePresence>
                            {unplacedExperts.map((expert) => (
                                <motion.div
                                    key={expert._id}
                                    layoutId={expert._id}
                                    drag
                                    dragSnapToOrigin
                                    onDragEnd={(e, info) => handleDragEnd(e, info, expert)}
                                    whileDrag={{ scale: 1.05, zIndex: 100, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                                    className="bg-white rounded-2xl p-4 border-2 border-gray-100 hover:border-green-200 cursor-grab active:cursor-grabbing transition-colors shadow-sm relative group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 text-lg">
                                            💧
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900">{expert.name}</h4>
                                            <p className="text-[10px] font-medium text-green-600">{expert.title}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {expert.skills.slice(0, 3).map((s, i) => (
                                            <span key={i} className="text-[8px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">
                                                {s.name}
                                            </span>
                                        ))}
                                    </div>
                                    {/* Drag Handle Overlay */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                            <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                                            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                                            <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                                        </svg>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {unplacedExperts.length === 0 && experts.length > 0 && (
                            <div className="text-center py-20 px-8">
                                <div className="text-4xl mb-4 opacity-20">✅</div>
                                <p className="text-xs text-gray-400 font-medium">All experts have been deployed to the board.</p>
                            </div>
                        )}
                        {experts.length === 0 && (
                            <div className="text-center py-20 px-8">
                                <div className="text-4xl mb-4 opacity-20">🔍</div>
                                <p className="text-xs text-gray-400 font-medium">No experts selected. Go back to search to find allies.</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Canvas: The Whiteboard */}
                <main
                    ref={canvasRef}
                    className="flex-1 bg-white relative overflow-hidden"
                    style={{
                        backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                >
                    {/* Zoom Controls */}
                    <div className="absolute top-6 right-6 flex items-center gap-2 z-[60] bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-gray-100 shadow-xl">
                        <button
                            onClick={() => setZoomScale(Math.max(0.2, zoomScale - 0.1))}
                            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all font-black text-lg"
                        >
                            -
                        </button>
                        <div className="px-3 min-w-[60px] text-center">
                            <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{Math.round(zoomScale * 100)}%</span>
                        </div>
                        <button
                            onClick={() => setZoomScale(Math.min(2, zoomScale + 0.1))}
                            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all font-black text-lg"
                        >
                            +
                        </button>
                        <button
                            onClick={() => setZoomScale(1)}
                            className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 transition-all text-[10px] font-black uppercase tracking-tighter"
                        >
                            Reset
                        </button>
                    </div>

                    <motion.div
                        animate={{ scale: zoomScale }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="w-full h-full relative origin-top-left"
                    >
                        {/* Canvas UI */}
                        <div className="absolute top-6 left-6 pointer-events-none">
                            <h2 className="text-4xl font-black text-gray-100 uppercase tracking-tighter select-none">Whiteboard Workspace</h2>
                        </div>

                        {/* Projects */}
                        {projects.map((project) => (
                            <motion.div
                                key={project.id}
                                drag
                                onDragEnd={(e, info) => {
                                    const canvasRect = canvasRef.current?.getBoundingClientRect();
                                    if (!canvasRect) return;
                                    const x = (info.point.x - canvasRect.left) / zoomScale;
                                    const y = (info.point.y - canvasRect.top) / zoomScale;
                                    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, x, y } : p));
                                }}
                                style={{ x: project.x, y: project.y, position: 'absolute' }}
                                className="w-[320px] min-h-[220px] cursor-grab active:cursor-grabbing z-0"
                            >
                                <div
                                    onClick={() => fetchProjectInsight(project)}
                                    className="h-full w-full bg-white/40 backdrop-blur-sm rounded-[2rem] border-4 border-dashed border-gray-200 p-6 flex flex-col hover:border-green-300 transition-colors relative group"
                                >
                                    <div className="mb-4">
                                        <h2 className="text-xl font-black text-gray-800 tracking-tight">{project.name}</h2>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{project.description}</p>
                                    </div>

                                    <div className="flex-1 flex flex-wrap gap-2 items-start content-start">
                                        {/* Enveloped Experts */}
                                        {placedExperts.filter(e => e.projectId === project.id).map((expert) => (
                                            <div key={expert._id} className="w-28 animate-in zoom-in-95 duration-200">
                                                <div className="bg-white rounded-xl p-2 shadow-md border border-gray-100 flex flex-col items-center text-center">
                                                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-1">
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M12 2.5C12 2.5 6.5 9.5 6.5 13.5C6.5 16.5 8.96 19 12 19C15.04 19 17.5 16.5 17.5 13.5C17.5 9.5 12 2.5 12 2.5Z" />
                                                        </svg>
                                                    </div>
                                                    <h4 className="text-[10px] font-black text-gray-900 line-clamp-1">{expert.name}</h4>
                                                    <p className="text-[7px] font-bold text-green-600 uppercase tracking-tighter">{expert.title}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {placedExperts.filter(e => e.projectId === project.id).length === 0 && (
                                            <div className="h-24 w-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl">
                                                <p className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em]">Drop Allies Here</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setProjects(prev => prev.filter(p => p.id !== project.id));
                                            }}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Loose/Placed Experts (Not in projects) */}
                        {placedExperts.filter(e => !e.projectId).map((expert) => (
                            <motion.div
                                key={expert._id}
                                drag
                                onDragEnd={(e, info) => {
                                    const canvasRect = canvasRef.current?.getBoundingClientRect();
                                    if (!canvasRect) return;
                                    const x = (info.point.x - canvasRect.left) / zoomScale;
                                    const y = (info.point.y - canvasRect.top) / zoomScale;

                                    // Check for project collision again on drop
                                    const collidedProject = projects.find(p => {
                                        return x > p.x && x < p.x + 320 && y > p.y && y < p.y + 220;
                                    });

                                    if (info.point.x < 320) {
                                        setPlacedExperts(prev => prev.filter(p => p._id !== expert._id));
                                    } else {
                                        // Update position and project assignment (or detachment if no collision)
                                        setPlacedExperts(prev => prev.map(p => p._id === expert._id ? { ...p, x, y, projectId: collidedProject?.id } : p));

                                        if (collidedProject) {
                                            setAssistantMsg(`${expert.name} drafted into ${collidedProject.name}.`);
                                            setAssistantOpen(true);
                                        } else if (expert.projectId) {
                                            setAssistantMsg(`${expert.name} has been detached from their project.`);
                                            setAssistantOpen(true);
                                        }
                                    }
                                }}
                                style={{ x: expert.x, y: expert.y, position: 'absolute' }}
                                className="w-64 cursor-move active:cursor-grabbing z-10"
                            >
                                <div className="bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 relative group animate-in zoom-in-90 duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 shadow-inner">
                                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2.5C12 2.5 6.5 9.5 6.5 13.5C6.5 16.5 8.96 19 12 19C15.04 19 17.5 16.5 17.5 13.5C17.5 9.5 12 2.5 12 2.5Z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 leading-tight">{expert.name}</h3>
                                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">{expert.title}</p>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mb-4 line-clamp-2 italic">"{expert.bio}"</p>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setPlacedExperts(prev => prev.filter(p => p._id !== expert._id))}
                                            className="text-[10px] font-black text-gray-300 hover:text-red-500 uppercase tracking-widest transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Empty Canvas Instructions */}
                        {placedExperts.length === 0 && projects.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center opacity-[0.03] select-none">
                                    <h1 className="text-[12rem] font-black leading-none px-20">MESH</h1>
                                    <p className="text-4xl font-bold uppercase tracking-[2rem] -mt-10">Board</p>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Modals & Overlays (Outside Zoom Container) */}
                    <AnimatePresence>
                        {assistantOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                                className="absolute bottom-8 right-8 w-96 max-h-[85vh] bg-gray-900 text-white rounded-[2.5rem] shadow-3xl flex flex-col border border-white/10 z-[100] overflow-hidden"
                            >
                                <div className="p-8 flex flex-col h-full overflow-hidden">
                                    <div className="flex items-center gap-4 mb-6 shrink-0">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                                            🤖
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight">AI Strategy Advisor</h3>
                                            <p className="text-[10px] text-green-400 uppercase tracking-widest font-black">Online & Analyzing</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 mb-6 scrollbar-hide">
                                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                                            <p className="text-xs leading-relaxed text-gray-300 font-medium whitespace-pre-wrap italic">
                                                "{assistantMsg}"
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 shrink-0">
                                        <button
                                            onClick={() => setAssistantOpen(false)}
                                            className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all"
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={handleAIAdvice}
                                            className="flex-1 py-4 bg-green-500 hover:bg-green-600 rounded-2xl text-xs font-bold text-white transition-all shadow-lg shadow-green-500/20"
                                        >
                                            Refresh Advice
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Create Project Modal */}
                    <AnimatePresence>
                        {isProjectModalOpen && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white rounded-[3rem] w-full max-w-xl shadow-4xl overflow-hidden border border-gray-100"
                                >
                                    <div className="p-10">
                                        <div className="mb-8">
                                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Create Project Object</h2>
                                            <p className="text-sm font-medium text-gray-400 mt-2">Define your strategic container on the whiteboard.</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Project Name</label>
                                                <input
                                                    type="text"
                                                    value={newProject.name}
                                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-green-400 focus:outline-none transition-colors"
                                                    placeholder="e.g., Q1 Infrastructure Redesign"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Description & Scope</label>
                                                <textarea
                                                    value={newProject.description}
                                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-green-400 focus:outline-none transition-colors h-24 resize-none"
                                                    placeholder="Briefly describe the vision..."
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Goals</label>
                                                    <input
                                                        type="text"
                                                        value={newProject.goals}
                                                        onChange={(e) => setNewProject({ ...newProject, goals: e.target.value })}
                                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold focus:border-green-400 focus:outline-none transition-colors"
                                                        placeholder="Goal A, B, C"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Objectives</label>
                                                    <input
                                                        type="text"
                                                        value={newProject.objectives}
                                                        onChange={(e) => setNewProject({ ...newProject, objectives: e.target.value })}
                                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold focus:border-green-400 focus:outline-none transition-colors"
                                                        placeholder="KPIs, milestones..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mt-10">
                                            <button
                                                onClick={() => setIsProjectModalOpen(false)}
                                                className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={createProject}
                                                className="flex-2 px-10 py-4 bg-green-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                                            >
                                                Place on Board
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Project Detail / AI Insight Modal */}
                    <AnimatePresence>
                        {isDetailModalOpen && selectedProject && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 100 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-[3.5rem] w-full max-w-4xl shadow-5xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
                                >
                                    <div className="p-12 overflow-y-auto scrollbar-hide flex-1">
                                        <div className="flex justify-between items-start mb-12">
                                            <div>
                                                <h1 className="text-5xl font-black text-gray-900 tracking-tighter">{selectedProject.name}</h1>
                                                <div className="flex gap-4 mt-4">
                                                    <span className="px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-100">Live Strategy</span>
                                                    <span className="px-4 py-1.5 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-gray-100">{placedExperts.filter(e => e.projectId === selectedProject.id).length} Allies Assigned</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsDetailModalOpen(false)}
                                                className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-12">
                                            <div className="col-span-2 space-y-12">
                                                <section>
                                                    <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">Project Context</h3>
                                                    <p className="text-lg font-medium text-gray-600 leading-relaxed italic border-l-4 border-green-400 pl-6">
                                                        "{selectedProject.description}"
                                                    </p>
                                                </section>

                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Core Goals</h4>
                                                        <p className="text-sm font-bold text-gray-700">{selectedProject.goals || 'No goals specified.'}</p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Key Objectives</h4>
                                                        <p className="text-sm font-bold text-gray-700">{selectedProject.objectives || 'No objectives specified.'}</p>
                                                    </div>
                                                </div>

                                                <section>
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-sm">🤖</div>
                                                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Strategic AI Inference</h3>
                                                    </div>
                                                    <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-4 font-mono text-[80px] text-white/5 font-black leading-none pointer-events-none select-none">AI</div>
                                                        {loadingInsight ? (
                                                            <div className="flex items-center gap-4 text-green-400 font-bold animate-pulse py-8">
                                                                <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                                                                <span className="text-xs uppercase tracking-widest">Synthesizing Team Synergy...</span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm leading-relaxed text-gray-300 font-medium italic">
                                                                "{aiInsight}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </section>
                                            </div>

                                            <div className="space-y-6">
                                                <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Designated Team</h3>
                                                <div className="space-y-3">
                                                    {placedExperts.filter(e => e.projectId === selectedProject.id).map(expert => (
                                                        <div key={expert._id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                                                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500 font-bold text-sm">
                                                                {expert.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-black text-gray-900 leading-tight">{expert.name}</h4>
                                                                <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest">{expert.title}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {placedExperts.filter(e => e.projectId === selectedProject.id).length === 0 && (
                                                        <div className="py-12 border-2 border-dashed border-gray-100 rounded-[2.5rem] flex items-center justify-center">
                                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Allies Assigned</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                </main>
            </div>
        </div >
    );
}
