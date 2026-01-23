
import React, { useState, useRef, useLayoutEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Subject, Mistake } from '../types';
import { Button } from './Button';
import { Camera, X, Loader2, Crop as CropIcon, Plus, ArrowLeft, Trash2, Check, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { translations } from '../utils/translations';

interface AddMistakeFormProps {
  onSave: (mistake: Omit<Mistake, 'id' | 'createdAt'>, id?: string) => void;
  onCancel: () => void;
  existingTags: string[];
  initialData?: Mistake;
}

const getAutoSemester = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; 
    if (month >= 2 && month <= 8) return `${year} 春季学期`;
    const fallYear = (month === 1) ? year - 1 : year;
    return `${fallYear} 秋季学期`;
};

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  )
}

const optimizeImage = async (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    if (!base64Str.startsWith('data:')) {
        img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280; 
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF'; 
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            let result = canvas.toDataURL('image/webp', 0.8);
            if (result.indexOf('image/webp') === -1) {
                result = canvas.toDataURL('image/jpeg', 0.8);
            }
            resolve(result);
          } else {
            resolve(base64Str);
          }
      } catch (e) {
          resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

export const AddMistakeForm: React.FC<AddMistakeFormProps> = ({ onSave, onCancel, existingTags, initialData }) => {
  const t = translations.zh;

  const [subject, setSubject] = useState<Subject>(initialData?.subject || Subject.MATH);
  const [semester, setSemester] = useState<string>(initialData?.semester || getAutoSemester());
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [currentTag, setCurrentTag] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [hasNewImage, setHasNewImage] = useState(false);

  const [viewportHeight, setViewportHeight] = useState('100vh');

  useLayoutEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    
    setTimeout(() => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64 = reader.result as string;
                const compressed = await optimizeImage(base64);
                setImagePreview(compressed);
                setHasNewImage(true);
                setIsCropping(true);
            } catch (error) {
                alert("图片处理失败");
            } finally {
                setIsProcessingImage(false);
            }
        };
        reader.readAsDataURL(file);
    }, 50);
  };

  const handleApplyCrop = async () => {
    if (completedCrop && imgRef.current && imagePreview) {
      const imageElement = imgRef.current;
      setIsProcessingImage(true);
      setTimeout(async () => {
          try {
            const croppedBase64 = await getCroppedImg(imageElement, completedCrop);
            const compressedWebp = await optimizeImage(croppedBase64);
            setImagePreview(compressedWebp);
            setHasNewImage(true);
            setIsCropping(false);
          } catch (e: any) {
            alert("裁剪失败: " + (e.message || "未知错误"));
          } finally {
            setIsProcessingImage(false);
          }
      }, 100);
    } else {
        setIsCropping(false);
    }
  };

  const handleSaveInternal = async () => {
    if (!subject || !semester) {
        alert("请完善科目和学期信息");
        return;
    }
    setIsProcessingImage(true);
    setTimeout(async () => {
        try {
            let finalImageUrl = imagePreview || undefined;
            if (hasNewImage && finalImageUrl && finalImageUrl.startsWith('data:')) {
                finalImageUrl = await optimizeImage(finalImageUrl);
            }
            onSave({ subject, semester: semester.trim(), imageUrl: finalImageUrl, tags, aiAnalysis: initialData?.aiAnalysis }, initialData?.id);
        } catch (e) {
            alert("保存出错");
            setIsProcessingImage(false);
        }
    }, 50);
  };

  const addTag = () => {
    const tagToAdd = currentTag.trim();
    if(tagToAdd && !tags.includes(tagToAdd)) {
        setTags([...tags, tagToAdd]);
        setCurrentTag('');
    }
  };

  // ---------------- UI Helpers ----------------
  // Mobile Header Action Button Logic
  const renderMobileHeaderRight = () => {
      if (isProcessingImage) return <Loader2 size={20} className="animate-spin text-blue-600" />;
      
      // Case 1: Cropping Mode -> Show Checkmark to confirm crop
      if (isCropping) {
          return (
              <button onClick={handleApplyCrop} className="p-2 bg-blue-600 text-white rounded-full shadow-md animate-in zoom-in">
                  <Check size={20} />
              </button>
          );
      }
      
      // Case 2: Preview Mode (Has Image) -> Show Checkmark/Save to submit form
      if (imagePreview) {
          return (
              <button onClick={handleSaveInternal} className="p-2 bg-blue-600 text-white rounded-full shadow-md animate-in zoom-in">
                  <Save size={20} />
              </button>
          );
      }

      // Case 3: No Image -> No right action
      return null;
  };

  const renderMobileHeaderLeft = () => {
      if (isCropping) {
          return (
              <button onClick={() => setIsCropping(false)} className="p-2 text-slate-500">
                  <ArrowLeft size={24} />
              </button>
          );
      }
      return (
          <button onClick={onCancel} className="p-2 text-slate-400">
              <X size={24} />
          </button>
      );
  };

  return (
    <div 
        className="fixed inset-0 z-[60] bg-white flex flex-col w-full overflow-hidden animate-soft"
        style={{ height: viewportHeight }}
    >
        {/* ============ Header ============ */}
        <div className="shrink-0 h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white z-[70] shadow-sm md:shadow-none">
            {/* Left Action */}
            <div className="flex w-16 justify-start">
                {renderMobileHeaderLeft()}
            </div>

            {/* Title */}
            <div className="flex flex-col items-center text-center">
                <h1 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">
                    {isCropping ? "裁剪图片" : (initialData ? "修改错题" : "录入错题")}
                </h1>
                {!isCropping && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{semester}</span>}
            </div>

            {/* Right Action (Mobile Primary Actions moved here!) */}
            <div className="flex w-16 justify-end">
                {renderMobileHeaderRight()}
            </div>
        </div>

        {/* ============ Body ============ */}
        <div className="flex-1 flex md:flex-row relative w-full overflow-hidden min-h-0">
            
            {/* Sidebar (PC) */}
            <div className={`
              w-full md:w-80 bg-white z-[80] md:z-auto border-r border-slate-100 shrink-0 overflow-y-auto
              hidden md:block
            `}>
                <div className="p-6 space-y-8 pb-32">
                    {/* Settings Form Content */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">所属学期</label>
                        <input type="text" value={semester} onChange={(e) => setSemester(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl text-xs py-3.5 px-4 font-semibold text-slate-600 outline-none focus:ring-1 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">对应科目</label>
                        <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
                            {Object.values(Subject).map((s) => (
                                <button key={s} type="button" onClick={() => setSubject(s)}
                                    className={`px-2 py-3 text-[10px] font-bold rounded-xl border transition-all ${subject === s ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                                    {t[`subj_${s}`] || s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">知识点标签</label>
                        <div className="flex gap-2">
                            <input type="text" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl text-xs py-3.5 px-4 font-semibold outline-none focus:ring-1 focus:ring-blue-100"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                            <button type="button" onClick={() => addTag()} className="bg-blue-600 text-white p-3.5 rounded-xl shadow-lg shadow-blue-100"><Plus size={18} /></button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-4">
                            {tags.map(tag => (
                                <span key={tag} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                                    {tag} <X size={12} onClick={() => setTags(tags.filter(t=>t!==tag))} className="cursor-pointer" />
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Main Content */}
            <div className="flex-1 w-full h-full bg-slate-50/50 relative flex flex-col min-h-0 overflow-hidden">
                
                {/* Image Area - Flex 1 to take all available space */}
                <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-4">
                    {!imagePreview && (
                        <div className="flex flex-col items-center justify-center w-full h-full animate-in fade-in zoom-in duration-300">
                            {/* 移动端：在拍摄按钮上方显示科目和tags */}
                            <div className="md:hidden w-full max-w-sm mb-8 space-y-4">
                                {/* 科目选择 */}
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-widest">对应科目</label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {Object.values(Subject).map((s) => (
                                            <button key={s} type="button" onClick={() => setSubject(s)}
                                                className={`px-2 py-2 text-[8px] font-bold rounded-lg border transition-all ${subject === s ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 text-center truncate'}`}>
                                                {t[`subj_${s}`] || s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tags选择 */}
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-widest">已有标签</label>
                                    <div className="flex flex-wrap gap-1">
                                        {existingTags.length > 0 ? (
                                            existingTags.map(tag => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => !tags.includes(tag) && setTags([...tags, tag])}
                                                    className={`px-2 py-1 text-[8px] font-bold rounded-lg border transition-all ${tags.includes(tag) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                >
                                                    {tag}
                                                </button>
                                            ))
                                        ) : (
                                            <span className="text-[8px] text-slate-300">暂无标签</span>
                                        )}
                                    </div>
                                </div>

                                {/* 快速添加新标签 */}
                                <div className="flex gap-1.5">
                                    <input type="text" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)}
                                        placeholder="新建标签"
                                        className="flex-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] py-2 px-2 font-semibold outline-none focus:ring-1 focus:ring-blue-100"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                                    <button type="button" onClick={() => addTag()} className="bg-blue-600 text-white p-2 rounded-lg shadow-md"><Plus size={14} /></button>
                                </div>

                                {/* 已选标签展示 */}
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {tags.map(tag => (
                                            <span key={tag} className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[8px] font-bold flex items-center gap-1">
                                                {tag} <X size={10} onClick={() => setTags(tags.filter(t=>t!==tag))} className="cursor-pointer" />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <label className="group flex flex-col items-center justify-center w-full max-w-sm aspect-square border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white hover:border-blue-400 cursor-pointer transition-all shadow-xl z-10 mx-4 active:scale-95">
                                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Camera size={40} />
                                </div>
                                <span className="text-[14px] font-bold text-slate-600 tracking-tight">点击拍照或上传</span>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">Automatic WebP Compression</span>
                            </label>
                        </div>
                    )}

                    {imagePreview && (
                        // 关键修复：width/height full + object-contain 确保图片完全展示在区域内，不会溢出
                        <div className={`relative w-full h-full flex flex-col items-center justify-center ${isCropping ? 'touch-none' : ''}`}>
                            {isCropping ? (
                                <ReactCrop 
                                    crop={crop} 
                                    onChange={c => setCrop(c)} 
                                    onComplete={c => setCompletedCrop(c)} 
                                    className="max-h-full"
                                    style={{ maxHeight: '100%' }} // Ensure crop container respects parent height
                                >
                                    <img 
                                        ref={imgRef} 
                                        src={imagePreview} 
                                        // PC/Mobile 通用：限制图片最大高度为父容器高度，最大宽度为100%
                                        style={{ maxHeight: 'calc(100vh - 8rem)', maxWidth: '100%', objectFit: 'contain' }} 
                                        onLoad={(e) => setCrop(centerAspectCrop(e.currentTarget.width, e.currentTarget.height, 1))} 
                                        alt="Crop" 
                                    />
                                </ReactCrop>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-4 w-full h-full">
                                    <img 
                                        src={imagePreview} 
                                        className="max-h-[calc(100%-120px)] max-w-full object-contain rounded-xl shadow-lg border-2 border-white" 
                                        alt="Preview" 
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobile Floating Tools (Only show on Mobile & when not cropping & when image exists) */}
                    {imagePreview && !isCropping && (
                        <div className="md:hidden absolute bottom-6 left-0 right-0 flex justify-center gap-6 z-10">
                             <button 
                                onClick={() => { setImagePreview(null); setHasNewImage(false); }} 
                                className="p-3 bg-white/90 backdrop-blur rounded-full text-red-400 shadow-lg border border-red-50"
                             >
                                 <Trash2 size={20} />
                             </button>
                             <button 
                                onClick={() => setIsCropping(true)} 
                                className="p-3 bg-white/90 backdrop-blur rounded-full text-blue-600 shadow-lg border border-blue-50"
                             >
                                 <CropIcon size={20} />
                             </button>
                        </div>
                    )}

                    {isProcessingImage && (
                        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">正在为您处理...</span>
                        </div>
                    )}
                </div>

                {/* ============ Footer (Desktop Only) ============ */}
                {/* 移动端因为有了顶部操作栏，这里直接隐藏，避免任何遮挡问题 */}
                {imagePreview && (
                    <div className="hidden md:block shrink-0 w-full bg-white border-t border-slate-100 p-6 z-[50]">
                        <div className="max-w-xl mx-auto flex items-center justify-between gap-6">
                            {isCropping ? (
                                <>
                                    <button onClick={() => setIsCropping(false)} className="flex-1 py-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">取消</button>
                                    <Button onClick={handleApplyCrop} className="flex-[3] h-14 rounded-2xl font-bold shadow-xl shadow-blue-100 text-sm">完成裁剪并生成</Button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setIsCropping(true)} disabled={isProcessingImage} className="flex flex-col items-center gap-1 group w-16">
                                        <div className="p-3.5 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shadow-sm"><CropIcon size={22}/></div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">裁剪</span>
                                    </button>

                                    <Button size="lg" onClick={handleSaveInternal} isLoading={isProcessingImage} className="flex-1 h-14 rounded-[1.25rem] font-bold shadow-2xl shadow-blue-200 text-base tracking-tight">
                                        保存错题
                                    </Button>

                                    <button onClick={() => { setImagePreview(null); setHasNewImage(false); }} disabled={isProcessingImage} className="flex flex-col items-center gap-1 group w-16">
                                        <div className="p-3.5 rounded-2xl bg-red-50 text-red-300 group-hover:bg-red-500 group-hover:text-white transition-all shadow-sm"><Trash2 size={22}/></div>
                                        <span className="text-[9px] font-bold text-red-300 uppercase tracking-widest mt-1">重选</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<string> {
  const canvas = document.createElement('canvas');
  if (!image.naturalWidth || !image.naturalHeight || !image.width || !image.height) {
     return Promise.reject(new Error("读取图片尺寸失败"));
  }
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  if (canvas.width <= 0 || canvas.height <= 0) {
      return Promise.reject(new Error("请选择裁剪区域"));
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas Error'));
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  try {
      ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY);
      return Promise.resolve(canvas.toDataURL('image/webp', 0.8));
  } catch (e) {
      return Promise.reject(e);
  }
}
