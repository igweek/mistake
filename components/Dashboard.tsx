
import React, { useState, useMemo } from 'react';
import { Mistake, Subject, Language } from '../types';
import { Card } from './Card';
import { Search, ChevronRight, BookOpen, Trash2, Sparkles, Folder, Edit3, RefreshCw, X, Clock, Grid, Tag, Filter, Maximize2, AlertCircle, ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { translations } from '../utils/translations';

interface DashboardProps {
  mistakes: Mistake[];
  onAddNew: () => void;
  onEdit: (mistake: Mistake) => void;
  onDelete: (id: string) => void;
  onUpdateMistake: (mistake: Mistake) => void;
  language: Language;
  viewState: 'all' | 'semesters' | 'subjects' | 'review';
  setViewState: (v: 'all' | 'semesters' | 'subjects' | 'review') => void;
  selectedSemester: string | null;
  setSelectedSemester: (s: string | null) => void;
  selectedSubject: Subject | null;
  setSelectedSubject: (s: Subject | null) => void;
  onCustomAnalyze: (mistake: Mistake) => Promise<string | undefined>;
}

// Fallback image component when the main image fails to load
const MistakeImage: React.FC<{ src: string }> = ({ src }) => {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-300 gap-2">
        <ImageIcon size={32} />
        <span className="text-[10px] font-bold uppercase tracking-widest">图片加载失败</span>
      </div>
    );
  }
  return (
    <img 
      src={src} 
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
      className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105" 
      alt="Mistake Thumbnail" 
    />
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ 
    mistakes, onAddNew, onEdit, onDelete, onUpdateMistake, language,
    viewState, setViewState, selectedSemester, setSelectedSemester, selectedSubject, setSelectedSubject,
    onCustomAnalyze
}) => {
  const t = translations.zh;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedAnalysisMistake, setSelectedAnalysisMistake] = useState<Mistake | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const normalize = (s: string) => s.trim();

  const semesters = useMemo(() => {
    const sems = new Set<string>();
    mistakes.forEach(m => sems.add(normalize(m.semester || '未知学期')));
    return Array.from(sems).sort((a, b) => b.localeCompare(a));
  }, [mistakes]);

  const availableSubjects = useMemo(() => {
    if (!selectedSemester) return [];
    const subs = new Set<Subject>();
    const targetSem = normalize(selectedSemester);
    mistakes.forEach(m => {
        if (normalize(m.semester || '未知学期') === targetSem) subs.add(m.subject);
    });
    return Array.from(subs).sort();
  }, [mistakes, selectedSemester]);

  const availableTags = useMemo(() => {
    let filteredForTags = mistakes;
    if (viewState === 'subjects') {
        filteredForTags = mistakes.filter(m => normalize(m.semester || '未知学期') === normalize(selectedSemester || ''));
    } else if (viewState === 'review') {
        filteredForTags = mistakes.filter(m => 
            normalize(m.semester || '未知学期') === normalize(selectedSemester || '') &&
            m.subject === selectedSubject
        );
    }
    
    const tags = new Set<string>();
    filteredForTags.forEach(m => {
        m.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [mistakes, viewState, selectedSemester, selectedSubject]);

  const currentMistakes = useMemo(() => {
    let filtered = mistakes;
    if (viewState === 'subjects') {
        filtered = mistakes.filter(m => normalize(m.semester || '未知学期') === normalize(selectedSemester || ''));
    } else if (viewState === 'review') {
        filtered = mistakes.filter(m => 
            normalize(m.semester || '未知学期') === normalize(selectedSemester || '') &&
            m.subject === selectedSubject
        );
    }
    
    const query = searchQuery.trim().toLowerCase();
    
    return filtered.filter(m => {
        if (!query) return true;
        const matchTag = m.tags?.some(tag => tag.toLowerCase().includes(query));
        const matchSemester = m.semester?.toLowerCase().includes(query);
        const subjEnum = m.subject.toLowerCase();
        const subjTrans = (translations[language][`subj_${m.subject}`] || '').toLowerCase();
        const matchSubject = subjEnum.includes(query) || subjTrans.includes(query);
        const matchText = (m.questionText && m.questionText.toLowerCase().includes(query)) || 
                          (m.aiAnalysis && m.aiAnalysis.toLowerCase().includes(query));
        return matchTag || matchSemester || matchSubject || matchText;
    });
  }, [mistakes, viewState, selectedSemester, selectedSubject, searchQuery, language]);

  const handleAnalyze = async (mistake: Mistake, isRegenerate = false) => {
    setAnalyzingIds(prev => new Set(prev).add(mistake.id));
    try {
      const analysis = await onCustomAnalyze(mistake);
      if (analysis) {
          const updated = { ...mistake, aiAnalysis: analysis };
          onUpdateMistake(updated);
          if (selectedAnalysisMistake?.id === mistake.id) {
              setSelectedAnalysisMistake(updated);
          } else if (!isRegenerate) {
              setSelectedAnalysisMistake(updated);
          }
      }
    } catch (e: any) {
      alert("分析失败: " + e.message);
    } finally {
      setAnalyzingIds(prev => {
        const n = new Set(prev); n.delete(mistake.id); return n;
      });
    }
  };

  const handleActionClick = (e: React.MouseEvent, callback: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  const toggleTagFilter = (tag: string) => {
      setSearchQuery(searchQuery === tag ? '' : tag);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-soft">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                {viewState === 'semesters' && "学期存档"}
                {viewState === 'subjects' && selectedSemester}
                {viewState === 'review' && `${selectedSemester} · ${t[`subj_${selectedSubject}`]}`}
                {viewState === 'all' && "最近记录"}
            </h1>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">
                    共 {currentMistakes.length} 道错题
                </span>
                {viewState !== 'semesters' && viewState !== 'all' && (
                    <button 
                        onClick={() => {
                            setSearchQuery('');
                            setViewState(viewState === 'review' ? 'subjects' : 'semesters');
                        }} 
                        className="text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase flex items-center gap-1 p-1"
                    >
                        <ArrowLeft size={10} /> 返回上一级
                    </button>
                )}
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input
                type="text"
                placeholder="搜索科目、标签、知识点..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-xl py-2.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-blue-100 transition-all outline-none text-slate-600 shadow-sm"
              />
              {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 p-1"
                    aria-label="清除搜索"
                  >
                      <X size={12} />
                  </button>
              )}
            </div>
            <div className="flex p-1 bg-slate-100/50 rounded-xl shrink-0">
                <button 
                    onClick={() => { setSearchQuery(''); setViewState('all'); }}
                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${viewState === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Clock size={14} className="inline mr-1.5" /> 最近
                </button>
                <button 
                    onClick={() => { setSearchQuery(''); setViewState('semesters'); }}
                    className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${viewState !== 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Folder size={14} className="inline mr-1.5" /> 存档
                </button>
            </div>
        </div>
      </div>

      {(viewState === 'review' || viewState === 'all') && availableTags.length > 0 && (
          <div className="flex items-center gap-3 mb-6 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                  <Filter size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">知识点</span>
              </div>
              <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar">
                  {availableTags.map(tag => (
                      <button 
                        key={tag} 
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                            searchQuery === tag 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'
                        }`}
                      >
                          {tag}
                      </button>
                  ))}
              </div>
          </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
          {viewState === 'semesters' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {semesters.map(sem => (
                      <Card key={sem} onClick={() => { setSelectedSemester(sem); setViewState('subjects'); }} className="p-7 flex items-center justify-between group hover:border-blue-200 transition-all">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                  <Folder size={22} />
                              </div>
                              <div className="flex flex-col text-left">
                                  <span className="font-bold text-slate-700">{sem}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{mistakes.filter(m => normalize(m.semester || '未知学期') === normalize(sem)).length} 题记录</span>
                              </div>
                          </div>
                          <ChevronRight className="text-slate-200 group-hover:text-blue-500 transition-colors" size={20} />
                      </Card>
                  ))}
                  {semesters.length === 0 && (
                      <div className="col-span-full py-20 flex flex-col items-center text-slate-300">
                          <BookOpen size={48} className="mb-4 opacity-20" />
                          <p className="text-sm font-bold uppercase tracking-widest">暂无错题记录</p>
                      </div>
                  )}
              </div>
          )}

          {viewState === 'subjects' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availableSubjects.map(sub => (
                      <Card key={sub} onClick={() => { setSelectedSubject(sub); setViewState('review'); }} className="p-6 flex flex-col items-center text-center gap-3 hover:border-blue-300">
                          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-slate-50 text-blue-600 mb-2">
                             <Grid size={24} />
                          </div>
                          <span className="font-bold text-slate-700">{t[`subj_${sub}`] || sub}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {mistakes.filter(m => normalize(m.semester || '未知学期') === normalize(selectedSemester!) && m.subject === sub).length} 题
                          </span>
                      </Card>
                  ))}
              </div>
          )}

          {(viewState === 'review' || viewState === 'all') && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
                    {currentMistakes.map((mistake, index) => (
                        <div key={mistake.id} className="group/card flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                        <div className="relative aspect-[4/3] bg-slate-50 cursor-pointer overflow-hidden" onClick={() => mistake.imageUrl && setLightboxImage(mistake.imageUrl)}>
                            <div className="absolute top-3 left-3 z-10 text-[9px] font-bold text-blue-500 bg-white/90 px-2 py-1 rounded-lg border border-blue-50"># {String(index + 1).padStart(2, '0')}</div>
                            <div className="absolute inset-0 bg-slate-900/0 group-hover/card:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover/card:opacity-100">
                                <Maximize2 className="text-white" size={24} />
                            </div>
                            {mistake.imageUrl ? (
                                <MistakeImage src={mistake.imageUrl} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200"><BookOpen size={40} /></div>
                            )}
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-wrap gap-1 flex-1">
                                    {mistake.tags?.map(tag => (
                                        <span key={tag} onClick={(e) => handleActionClick(e, () => toggleTagFilter(tag))} className="text-[9px] font-bold text-blue-500 bg-blue-50/50 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100 transition-colors">{tag}</span>
                                    ))}
                                </div>
                                <div className="flex gap-1 ml-2">
                                    <button 
                                        onClick={(e) => handleActionClick(e, () => onEdit(mistake))} 
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        aria-label="编辑错题"
                                    >
                                        <Edit3 size={15}/>
                                    </button>
                                    <button 
                                        onClick={(e) => handleActionClick(e, () => onDelete(mistake.id))} 
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        aria-label="删除错题"
                                    >
                                        <Trash2 size={15}/>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-50 rounded-md">{t[`subj_${mistake.subject}`]}</span>
                                <span className="text-[9px] font-bold text-slate-300 uppercase truncate">{mistake.semester}</span>
                            </div>

                            <div className="mt-auto">
                                <button 
                                    onClick={() => mistake.aiAnalysis ? setSelectedAnalysisMistake(mistake) : handleAnalyze(mistake)}
                                    className={`w-full py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-2 border border-slate-100 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 shadow-sm`}
                                >
                                    {analyzingIds.has(mistake.id) ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {mistake.aiAnalysis ? "查看解析" : "AI 解析"}
                                </button>
                            </div>
                        </div>
                        </div>
                    ))}
                </div>
                {currentMistakes.length === 0 && searchQuery && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-in fade-in">
                        <AlertCircle size={40} className="mb-4 text-slate-300" />
                        <p className="text-sm font-bold text-slate-500">未找到相关错题</p>
                        <button onClick={() => setSearchQuery('')} className="mt-4 text-xs font-bold text-blue-600 hover:underline">
                            清除搜索条件
                        </button>
                    </div>
                )}
              </>
          )}
      </div>

      {selectedAnalysisMistake && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedAnalysisMistake(null)}></div>
              <div className="relative bg-white w-full max-w-4xl max-h-full rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                  <div className="absolute top-4 right-4 z-50 flex gap-2">
                      <button 
                        onClick={() => setSelectedAnalysisMistake(null)} 
                        className="p-2 bg-white/90 rounded-full shadow-lg text-slate-400 hover:text-slate-800 transition-colors focus:outline-none"
                        aria-label="关闭解析"
                      >
                          <X size={20} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar">
                      <div className="bg-slate-50 flex items-center justify-center p-6 border-b border-slate-100 min-h-[300px]">
                          {selectedAnalysisMistake.imageUrl ? (
                              <img src={selectedAnalysisMistake.imageUrl} className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-lg border-4 border-white" alt="Question" />
                          ) : (
                              <div className="text-slate-300 flex flex-col items-center gap-2">
                                  <BookOpen size={48} />
                                  <span className="text-xs font-bold uppercase tracking-widest">无图片信息</span>
                              </div>
                          )}
                      </div>

                      <div className="p-8 md:p-12 relative">
                          {analyzingIds.has(selectedAnalysisMistake.id) && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 animate-bounce mb-4">
                                      <Sparkles size={24} />
                                  </div>
                                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest animate-pulse">解析中...</p>
                              </div>
                          )}

                          <div className="flex items-center gap-3 mb-8">
                              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-100">
                                  <Sparkles size={20} />
                              </div>
                              <div className="flex items-center gap-3">
                                  <div>
                                      <h2 className="text-lg font-bold text-slate-800">名师智能解析</h2>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI Expert Analysis</p>
                                  </div>
                                  {selectedAnalysisMistake.aiAnalysis && !analyzingIds.has(selectedAnalysisMistake.id) && (
                                      <button 
                                        onClick={() => handleAnalyze(selectedAnalysisMistake, true)}
                                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 ml-2"
                                        aria-label="重新生成解析"
                                      >
                                        <RefreshCw size={14} />
                                        <span className="text-[10px] font-bold px-1">刷新</span>
                                      </button>
                                  )}
                              </div>
                          </div>

                          <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-600 font-serif-content">
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {selectedAnalysisMistake.aiAnalysis || ''}
                              </ReactMarkdown>
                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-50 px-8 py-4 flex items-center justify-between border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                      <div className="flex gap-4">
                        <span>{t[`subj_${selectedAnalysisMistake.subject}`]}</span>
                        <span>{selectedAnalysisMistake.semester}</span>
                      </div>
                      <div className="flex gap-2">
                        {selectedAnalysisMistake.tags?.map(t => <span key={t} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">#{t}</span>)}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {lightboxImage && (
          <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setLightboxImage(null)}>
              <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
                  <button className="absolute top-4 right-4 text-white p-4" aria-label="关闭预览"><X size={32} /></button>
                  <img src={lightboxImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Fullscreen Preview" />
              </div>
          </div>
      )}
    </div>
  );
};

const ArrowLeft: React.FC<{size?: number}> = ({size = 14}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
