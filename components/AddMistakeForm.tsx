
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

// 优化后的图片压缩函数
const optimizeImage = async (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    
    // 对于本地 Data URI，严禁设置 crossOrigin，否则会导致 Canvas 污染
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
            
            // Try WebP, fallback to JPEG
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

    img.onerror = (e) => {
        console.error("Image load failed:", e);
        resolve(base64Str);
    };

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
    
    // 给 UI 一点时间渲染 Loading 状态
    setTimeout(() => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64 = reader.result as string;
                // 上传时先进行一次基础压缩，防止大图卡顿
                const compressed = await optimizeImage(base64);
                setImagePreview(compressed);
                setHasNewImage(true);
                setIsCropping(true);
            } catch (error) {
                console.error("Upload processing failed", error);
                alert("图片处理失败，请重试");
            } finally {
                setIsProcessingImage(false);
            }
        };
        reader.onerror = () => {
             setIsProcessingImage(false);
             alert("读取文件失败");
        };
        reader.readAsDataURL(file);
    }, 50);
  };

  const handleApplyCrop = async () => {
    // 关键修复：确保 imgRef.current 存在
    // 这里的逻辑是：UI 显示 Loading 遮罩 -> 下一个 Event Loop 执行裁剪 -> 裁剪完毕 -> 关闭 Loading
    if (completedCrop && imgRef.current && imagePreview) {
      const imageElement = imgRef.current; // 锁定引用
      setIsProcessingImage(true);
      
      setTimeout(async () => {
          try {
            // 使用锁定的引用进行裁剪
            const croppedBase64 = await getCroppedImg(imageElement, completedCrop);
            const compressedWebp = await optimizeImage(croppedBase64);
            setImagePreview(compressedWebp);
            setHasNewImage(true);
            setIsCropping(false);
          } catch (e: any) {
            console.error("Crop failed", e);
            alert("裁剪失败: " + (e.message || "未知错误"));
          } finally {
            setIsProcessingImage(false);
          }
      }, 100);
    } else {
        // 如果没有裁剪框，直接完成
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
            // 如果是新图片，保存前再确保优化一次（虽然上传和裁剪时都做了，兜底）
            if (hasNewImage && finalImageUrl && finalImageUrl.startsWith('data:')) {
                finalImageUrl = await optimizeImage(finalImageUrl);
            }
            
            onSave({ 
                subject, 
                semester: semester.trim(), 
                imageUrl: finalImageUrl, 
                tags,
                aiAnalysis: initialData?.aiAnalysis 
            }, initialData?.id);
        } catch (e) {
            console.error("Save failed:", e);
            alert("保存处理出错，请重试");
            setIsProcessingImage(false);
        }
    }, 50);
  };

  const addTag = (tagName?: string) => {
    const tagToAdd = (tagName || currentTag).trim();
    if(tagToAdd && !tags.includes(tagToAdd)) {
        setTags([...tags, tagToAdd]);
        setCurrentTag('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col overflow-hidden animate-soft">
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white z-50">
            <button onClick={onCancel} disabled={isProcessingImage} className="text-slate-400 hover:text-blue-600 transition-colors p-2"><ArrowLeft size={22} /></button>
            <div className="flex flex-col items-center text-center">
                <h1 className="text-sm font-bold text-slate-800 tracking-tight">{initialData ? "编辑错题" : "添加错题"}</h1>
                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{semester}</span>
            </div>
            <div className="w-10"></div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
            <div className={`w-full md:w-80 p-6 overflow-y-auto border-r border-slate-100 bg-white shrink-0 ${isCropping ? 'hidden md:block opacity-40' : ''}`}>
                <div className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">所属学期</label>
                        <input 
                            type="text" 
                            value={semester} 
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-lg text-xs py-2.5 px-4 font-semibold text-slate-600 outline-none focus:ring-1 focus:ring-blue-100 transition-all" 
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">对应科目</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.values(Subject).map((s) => (
                                <button key={s} type="button" onClick={() => setSubject(s)}
                                    className={`px-3 py-2.5 text-[11px] font-bold rounded-lg border transition-all ${
                                        subject === s ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'
                                    }`}>
                                    {t[`subj_${s}`] || s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">知识点标签</label>
                        <div className="flex gap-2">
                            <input type="text" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)}
                                className="flex-1 bg-slate-50 border-none rounded-lg text-xs py-2.5 px-4 font-semibold outline-none focus:ring-1 focus:ring-blue-100"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                            <button type="button" onClick={() => addTag()} className="bg-blue-600 text-white p-2.5 rounded-lg"><Plus size={18} /></button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-4">
                            {tags.map(tag => (
                                <span key={tag} className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5">
                                    {tag} <X size={12} onClick={() => setTags(tags.filter(t=>t!==tag))} className="cursor-pointer" />
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 relative">
                <div className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden relative">
                    
                    {/* 上传按钮区域 */}
                    {!imagePreview && (
                        <label className="group flex flex-col items-center justify-center w-72 h-72 border-2 border-dashed border-slate-200 rounded-3xl bg-white hover:border-blue-400 cursor-pointer transition-all shadow-xl z-10">
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            <Camera size={44} className="text-blue-500 mb-4" />
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">点击拍照 / 上传图片</span>
                        </label>
                    )}

                    {/* 图片预览与裁剪区域 - 即使在处理中也不要卸载(Unmount) */}
                    {imagePreview && (
                        <div className="w-full h-full flex items-center justify-center relative">
                             {/* 裁剪模式 */}
                            {isCropping ? (
                                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} className="max-h-full">
                                    <img 
                                        ref={imgRef} 
                                        src={imagePreview} 
                                        // 本地图片不需要 crossOrigin，只有远程图片需要
                                        // crossOrigin={imagePreview.startsWith('http') ? "anonymous" : undefined}
                                        style={{ maxHeight: 'calc(100vh - 280px)', maxWidth: '100%' }} 
                                        onLoad={(e) => setCrop(centerAspectCrop(e.currentTarget.width, e.currentTarget.height, 1))} 
                                        alt="Crop" 
                                    />
                                </ReactCrop>
                            ) : (
                                <img src={imagePreview} className="max-h-full max-w-full object-contain rounded-lg shadow-xl border-4 border-white" alt="Mistake" />
                            )}
                        </div>
                    )}

                    {/* Loading 遮罩层 - 覆盖在图片上方，而不是替换图片 */}
                    {isProcessingImage && (
                        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">处理中...</span>
                        </div>
                    )}
                </div>

                {imagePreview && (
                    <div className="w-full bg-white border-t border-slate-100 p-6 z-20 disabled:opacity-50">
                        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
                            {isCropping ? (
                                <>
                                    <Button variant="secondary" onClick={() => setIsCropping(false)} className="flex-1" disabled={isProcessingImage}>取消</Button>
                                    <Button onClick={handleApplyCrop} className="flex-[2]" disabled={isProcessingImage}>完成裁剪</Button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setIsCropping(true)} disabled={isProcessingImage} className="flex flex-col items-center gap-1 p-2 group disabled:opacity-50">
                                        <div className="p-3 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all"><CropIcon size={20}/></div>
                                        <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-600">裁剪</span>
                                    </button>
                                    <Button size="lg" onClick={handleSaveInternal} isLoading={isProcessingImage} className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-blue-100">
                                        保存错题
                                    </Button>
                                    <button onClick={() => { setImagePreview(null); setHasNewImage(false); }} disabled={isProcessingImage} className="flex flex-col items-center gap-1 p-2 group disabled:opacity-50">
                                        <div className="p-3 rounded-xl bg-red-50 text-red-300 group-hover:bg-red-500 group-hover:text-white transition-all"><Trash2 size={20}/></div>
                                        <span className="text-[9px] font-bold text-red-300 group-hover:text-red-500">重选</span>
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
  // Check for invalid dimensions
  if (!image.naturalWidth || !image.naturalHeight || !image.width || !image.height) {
     return Promise.reject(new Error("Image dimensions invalid: " + image.naturalWidth));
  }
  
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  
  if (canvas.width <= 0 || canvas.height <= 0) {
      // 如果裁剪框异常，返回原图（或者报错）
      // 这里为了体验，如果裁剪框极小，可能用户没选好，返回原图转base64
      console.warn("Crop dimensions too small, using original");
      // return Promise.resolve(image.src); 
      return Promise.reject(new Error("裁剪区域太小"));
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('No 2d context'));
  
  // Fill white for transparency
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  try {
      ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY);
      return Promise.resolve(canvas.toDataURL('image/webp', 0.8));
  } catch (e) {
      console.error("Canvas export failed", e);
      return Promise.reject(e);
  }
}
