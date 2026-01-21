
import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Subject, Mistake } from '../types';
import { Button } from './Button';
import { Camera, X, Loader2, Crop as CropIcon, Check, Plus, ArrowLeft, Trash2 } from 'lucide-react';
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
          console.error("Image optimization error:", e);
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
                console.error("Upload failed", error);
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

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col overflow-hidden animate-soft pb-[env(safe-area-inset-bottom)]">
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white z-50">
            <button onClick={onCancel} disabled={isProcessingImage} className="text-slate-400 hover:text-blue-600 transition-colors p-2"><ArrowLeft size={22} /></button>
            <div className="flex flex-col items-center text-center">
                <h1 className="text-sm font-bold text-slate-800 tracking-tight">{initialData ? "编辑错题" : "添加错题"}</h1>
                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{semester}</span>
            </div>
            <div className="w-10"></div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
            {/* Sidebar / Settings Area - Hidden on mobile during cropping for better space */}
            <div className={`w-full md:w-80 p-6 overflow-y-auto border-r border-slate-100 bg-white shrink-0 ${isCropping ? 'hidden md:block opacity-40' : ''}`}>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">所属学期</label>
                        <input 
                            type="text" 
                            value={semester} 
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl text-xs py-3 px-4 font-semibold text-slate-600 outline-none focus:ring-1 focus:ring-blue-100 transition-all" 
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">对应科目</label>
                        <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
                            {Object.values(Subject).map((s) => (
                                <button key={s} type="button" onClick={() => setSubject(s)}
                                    className={`px-2 py-3 text-[10px] font-bold rounded-xl border transition-all ${
                                        subject === s ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'
                                    }`}>
                                    {t[`subj_${s}`] || s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">知识点标签</label>
                        <div className="flex gap-2">
                            <input type="text" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl text-xs py-3 px-4 font-semibold outline-none focus:ring-1 focus:ring-blue-100"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                            <button type="button" onClick={() => addTag()} className="bg-blue-600 text-white p-3 rounded-xl"><Plus size={20} /></button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {tags.map(tag => (
                                <span key={tag} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                                    {tag} <X size={12} onClick={() => setTags(tags.filter(t=>t!==tag))} className="cursor-pointer" />
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 relative">
                <div className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden relative">
                    {!imagePreview && (
                        <label className="group flex flex-col items-center justify-center w-full max-w-sm aspect-square border-2 border-dashed border-slate-200 rounded-3xl bg-white hover:border-blue-400 cursor-pointer transition-all shadow-xl z-10 mx-4">
                            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                            <Camera size={48} className="text-blue-500 mb-4" />
                            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest text-center px-4">拍照上传错题</span>
                        </label>
                    )}

                    {imagePreview && (
                        <div className={`w-full h-full flex items-center justify-center relative ${isCropping ? 'touch-none' : ''}`}>
                            {isCropping ? (
                                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} className="max-h-full">
                                    <img 
                                        ref={imgRef} 
                                        src={imagePreview} 
                                        style={{ maxHeight: 'calc(100vh - 220px)', maxWidth: '100vw' }} 
                                        onLoad={(e) => setCrop(centerAspectCrop(e.currentTarget.width, e.currentTarget.height, 1))} 
                                        alt="Crop" 
                                    />
                                </ReactCrop>
                            ) : (
                                <img src={imagePreview} className="max-h-full max-w-full object-contain rounded-lg shadow-xl border-4 border-white" alt="Preview" />
                            )}
                        </div>
                    )}

                    {isProcessingImage && (
                        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Loader2 className="animate-spin text-blue-600 mb-2" size={44} />
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">请稍候...</span>
                        </div>
                    )}
                </div>

                {imagePreview && (
                    <div className="w-full bg-white border-t border-slate-100 p-4 md:p-6 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
                            {isCropping ? (
                                <>
                                    <Button variant="secondary" onClick={() => setIsCropping(false)} className="flex-1 h-12" disabled={isProcessingImage}>取消</Button>
                                    <Button onClick={handleApplyCrop} className="flex-[2] h-12" disabled={isProcessingImage}>完成裁剪</Button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setIsCropping(true)} disabled={isProcessingImage} className="flex flex-col items-center gap-1 p-2 group">
                                        <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all"><CropIcon size={24}/></div>
                                        <span className="text-[10px] font-bold text-slate-400">裁剪</span>
                                    </button>
                                    <Button size="lg" onClick={handleSaveInternal} isLoading={isProcessingImage} className="flex-1 h-14 rounded-2xl font-bold shadow-xl shadow-blue-100 text-base">
                                        保存题目
                                    </Button>
                                    <button onClick={() => { setImagePreview(null); setHasNewImage(false); }} disabled={isProcessingImage} className="flex flex-col items-center gap-1 p-2 group">
                                        <div className="p-3 rounded-2xl bg-red-50 text-red-300 group-hover:bg-red-500 group-hover:text-white transition-all"><Trash2 size={24}/></div>
                                        <span className="text-[10px] font-bold text-red-300">重选</span>
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
     return Promise.reject(new Error("图片无效"));
  }
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  if (canvas.width <= 0 || canvas.height <= 0) {
      return Promise.reject(new Error("裁剪区域无效"));
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas Context Error'));
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  try {
      ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY);
      return Promise.resolve(canvas.toDataURL('image/webp', 0.8));
  } catch (e) {
      return Promise.reject(e);
  }
}
