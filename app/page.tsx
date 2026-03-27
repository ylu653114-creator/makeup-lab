"use client";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Zap, Undo2, Sparkles, CheckCircle2, Brush, MousePointer2 } from 'lucide-react';

// --- 子组件 1: 摄像头拍摄 ---
function CameraCapture({ onCapture }: { onCapture: (img: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { aspectRatio: 1, width: 450, height: 450 } 
        });
        if (videoRef.current) videoRef.current.srcObject = s;
        setStream(s);
      } catch (err) {
        alert("请允许摄像头权限以开启理容实验");
      }
    }
    setupProp();
    async function setupProp() { await setupCamera(); }
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 450; canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (ctx && videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, 450, 450);
      onCapture(canvas.toDataURL('image/png'));
      stream?.getTracks().forEach(t => t.stop());
    }
  };

  return (
    <div style={{ position: 'relative', width: '450px', height: '450px', background: '#000', borderRadius: '40px', overflow: 'hidden', border: '8px solid #fff', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <button onClick={takePhoto} style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '70px', height: '70px', borderRadius: '50%', border: '5px solid #fff', background: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 20px rgba(212,175,55,0.5)' }}>
        <Zap size={30} fill="currentColor" />
      </button>
    </div>
  );
}

// --- 子组件 2: 理容画布 ---
function ProfessionalCanvas({ capturedImage, toolConfig, undoTrigger }: { capturedImage: string, toolConfig: any, undoTrigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const historyRef = useRef<ImageData[]>([]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const img = new Image();
    img.src = capturedImage;
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 450, 450);
      if (ctx) historyRef.current = [ctx.getImageData(0, 0, 450, 450)];
    };
  }, [capturedImage]);

  useEffect(() => {
    if (undoTrigger > 0 && historyRef.current.length > 1) {
      historyRef.current.pop();
      canvasRef.current?.getContext('2d')?.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
    }
  }, [undoTrigger]);

  const draw = (e: any) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!ctx || !rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = ctx.createRadialGradient(x, y, 0, x, y, toolConfig.size);
    g.addColorStop(0, toolConfig.color + Math.floor(toolConfig.opacity * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, toolConfig.color + '00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, toolConfig.size, 0, Math.PI * 2); ctx.fill();
  };

  return (
    <div style={{ padding: '10px', background: '#fff', borderRadius: '32px', border: '1px solid #eee', boxShadow: '0 20px 60px rgba(0,0,0,0.05)' }}>
      <canvas ref={canvasRef} width={450} height={450} onMouseDown={() => setIsDrawing(true)} onMouseUp={() => { setIsDrawing(false); const ctx = canvasRef.current?.getContext('2d'); if (ctx) historyRef.current.push(ctx.getImageData(0, 0, 450, 450)); }} onMouseMove={draw} style={{ borderRadius: '24px', cursor: 'crosshair', background: '#fdfdfb' }} />
    </div>
  );
}

// --- 主页面 ---
export default function MakeupGame() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [capturedImage, setCapturedImage] = useState("");
  const [undoCounter, setUndoCounter] = useState(0);
  const [brushSize, setBrushSize] = useState(25);
  const [currentMode, setCurrentMode] = useState('brush');
  const [selectedColor, setSelectedColor] = useState('#5D4037');
  const [aiAdvice, setAiAdvice] = useState("正在通过 AI 分析您的面部轮廓...");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const brushColors = {
    shading: ['#5D4037', '#8D6E63', '#A1887F'], 
    highlight: ['#FFF9C4', '#FEF3C7', '#FFFFFF'] 
  };

  const fetchAiAdvice = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/makeup', { method: 'POST', body: JSON.stringify({ faceShape: 'custom' }) });
      const data = await res.json();
      setAiAdvice(data.advice);
    } catch {
      setAiAdvice("建议：沿下颌线少量叠涂修容，在受光面使用柔和提亮。");
    }
    setLoading(false);
  };

  const handleCapture = (img: string) => {
    setCapturedImage(img);
    setStep(2);
    fetchAiAdvice();
  };

  const toolModes: any = {
    brush: { color: selectedColor, opacity: 0.05, label: '理容刷' },
    liner_shadow: { color: '#8D6E63', opacity: 0.07, label: '卧蚕笔(阴)' },
    liner_light: { color: '#FFF9C4', opacity: 0.10, label: '卧蚕笔(提)' }
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#FDFDFB', color: '#1A1A1A', padding: '40px' }}>
      <header style={{ maxWidth: '1100px', margin: '0 auto 60px', borderBottom: '1px solid #E5E5E1', paddingBottom: '20px' }}>
        <h1 style={{ letterSpacing: '0.3em', fontSize: '24px', fontWeight: 'bold' }}>LABORATORY <span style={{ color: '#D4AF37' }}>0.1</span></h1>
      </header>

      <section style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '470px 1fr', gap: '60px' }}>
        {/* 左侧区域 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          {step === 1 ? <CameraCapture onCapture={handleCapture} /> : (
            <>
              <ProfessionalCanvas capturedImage={capturedImage} toolConfig={{ ...toolModes[currentMode], size: brushSize }} undoTrigger={undoCounter} />
              <button onClick={() => setUndoCounter(prev => prev + 1)} style={{ fontSize: '11px', color: '#D4AF37', background: '#fff', padding: '10px 30px', borderRadius: '30px', border: '1px solid #D4AF37', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px' }}>UNDO LAST STROKE ↩️</button>
            </>
          )}
        </div>

        {/* 右侧控制面板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 style={{ fontSize: '30px', fontWeight: '300', marginBottom: '20px', letterSpacing: '-1px' }}>拍摄您的面部档案</h2>
                <p style={{ color: '#666', lineHeight: '1.8', fontSize: '15px' }}>请正对摄像头，确保光线充足。点击金色闪电按钮捕捉影像，系统将为您开启专属理容实验。</p>
              </motion.div>
            ) : (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {/* AI Advice Panel */}
                <div style={{ background: '#fff', borderLeft: '4px solid #D4AF37', padding: '25px', borderRadius: '0 16px 16px 0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: '35px' }}>
                  <p style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.1em' }}>AI EXPERT ADVICE</p>
                  <p style={{ fontSize: '14px', color: '#555', fontStyle: 'italic', lineHeight: '1.6' }}>{loading ? "分析中..." : aiAdvice}</p>
                </div>

                {/* Toolbox */}
                <div style={{ marginBottom: '30px' }}>
                  <p style={{ fontSize: '11px', color: '#999', marginBottom: '15px', letterSpacing: '0.1em' }}>TOOL SELECTION</p>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {['brush', 'liner_shadow', 'liner_light'].map(m => (
                      <div key={m} onClick={() => setCurrentMode(m)} style={{ cursor: 'pointer', transition: '0.3s', opacity: currentMode === m ? 1 : 0.3 }}>
                         <img src={m === 'brush' ? '/brush.png' : '/liner.png'} alt={m} style={{ width: '55px', height: '55px', border: currentMode === m ? '2px solid #D4AF37' : '1px solid #eee', borderRadius: '12px', padding: '3px', transform: m === 'liner_light' ? 'rotate(180deg)' : 'none' }} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Color Selector (Brush Only) */}
                  {currentMode === 'brush' && (
                    <div style={{ marginTop: '25px', display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid #f9f9f9', paddingTop: '25px' }}>
                      {brushColors.shading.map(c => <div key={c} onClick={() => setSelectedColor(c)} style={{ width: '24px', height: '24px', background: c, borderRadius: '50%', cursor: 'pointer', border: selectedColor === c ? '2px solid #D4AF37' : '2px solid #fff', transition: '0.2s' }} />)}
                      <div style={{ width: '1px', height: '18px', background: '#eee', margin: '0 10px' }} />
                      {brushColors.highlight.map(c => <div key={c} onClick={() => setSelectedColor(c)} style={{ width: '24px', height: '24px', background: c, borderRadius: '50%', cursor: 'pointer', border: selectedColor === c ? '2px solid #D4AF37' : '2px solid #fff', transition: '0.2s' }} />)}
                    </div>
                  )}
                </div>

                {/* Size Slider */}
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999', marginBottom: '12px', letterSpacing: '1px' }}>
                     <span>BRUSH SIZE</span>
                     <span>{brushSize}PX</span>
                  </div>
                  <input type="range" min="5" max="65" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: '#D4AF37' }} />
                </div>

                <button onClick={() => alert('实验报告已生成')} style={{ width: '100%', padding: '22px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '18px', letterSpacing: '0.25em', cursor: 'pointer', fontWeight: 'bold' }}>COMPLETE PROCESS</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}