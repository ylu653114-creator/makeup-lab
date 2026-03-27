"use client";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Zap, Undo2, Sparkles, CheckCircle2, RefreshCcw, Quote } from 'lucide-react';

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
      } catch (err) { alert("请允许摄像头权限"); }
    }
    setupCamera();
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
      <button 
        onClick={takePhoto} 
        style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '75px', height: '75px', borderRadius: '50%', border: '4px solid #fff', background: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 100, boxShadow: '0 0 30px rgba(212, 175, 55, 0.6)' }}
      >
        <Zap size={32} fill="currentColor" />
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
      <canvas ref={canvasRef} width={450} height={450} onMouseDown={() => setIsDrawing(true)} onMouseUp={() => { setIsDrawing(false); const ctx = canvasRef.current?.getContext('2d'); if (ctx) historyRef.current.push(ctx.getImageData(0, 0, 450, 450)); }} onMouseMove={draw} style={{ borderRadius: '24px', cursor: 'crosshair', background: '#FDFDFB' }} />
    </div>
  );
}

// --- 主页面 ---
export default function MakeupGame() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [capturedImage, setCapturedImage] = useState("");
  const [undoCounter, setUndoCounter] = useState(0);
  const [brushSize, setBrushSize] = useState(24);
  const [currentMode, setCurrentMode] = useState('brush');
  const [selectedColor, setSelectedColor] = useState('#5D4037');
  const [aiAdvice, setAiAdvice] = useState("正在通过云端 AI 分析您的面部光影...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [persona, setPersona] = useState({ name: "", desc: "", star: "", img: "" });

  useEffect(() => { setMounted(true); }, []);

  const brushColors = {
    shading: ['#5D4037', '#8D6E63', '#A1887F'], 
    highlight: ['#FFF9C4', '#FEF3C7', '#FFFFFF'] 
  };

  const fetchFinalPersona = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/makeup', { 
        method: 'POST', 
        body: JSON.stringify({ action: 'analyze_persona', image: capturedImage }) 
      });
      const data = await res.json();
      setPersona({
        name: data.name || "雅痞绅士",
        desc: data.desc || "极致的留白与深邃的轮廓在您面上达到了艺术般的平衡。",
        star: data.star || "金城武",
        img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop"
      });
      setStep(3);
    } catch {
      setStep(3); // 即使失败也展示默认
    }
    setIsAnalyzing(false);
  };

  const toolModes: any = {
    brush: { color: selectedColor, opacity: 0.05 },
    liner_shadow: { color: '#8D6E63', opacity: 0.07 },
    liner_light: { color: '#FFF9C4', opacity: 0.10 }
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#FDFDFB', color: '#1A1A1A', padding: '40px', fontFamily: 'serif' }}>
      <header style={{ maxWidth: '1100px', margin: '0 auto 60px', borderBottom: '1px solid #E5E5E1', paddingBottom: '20px' }}>
        <h1 style={{ letterSpacing: '0.4em', fontSize: '24px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>LABORATORY <span style={{ color: '#D4AF37' }}>0.1</span></h1>
      </header>

      <section style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          {step !== 3 ? (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: '470px 1fr', gap: '60px' }}>
              {/* 左侧编辑器 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                {step === 1 ? (
                  <CameraCapture onCapture={(img) => { setCapturedImage(img); setStep(2); }} />
                ) : (
                  <>
                    <ProfessionalCanvas capturedImage={capturedImage} toolConfig={{ ...toolModes[currentMode], size: brushSize }} undoTrigger={undoCounter} />
                    <button onClick={() => setUndoCounter(v => v + 1)} style={{ marginTop: '20px', background: 'none', border: '1px solid #D4AF37', color: '#D4AF37', padding: '10px 30px', borderRadius: '30px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>UNDO LAST STROKE ↩️</button>
                  </>
                )}
              </div>

              {/* 右侧控制台 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {step === 1 ? (
                  <div>
                    <h2 style={{ fontSize: '36px', fontWeight: '300', marginBottom: '20px', fontFamily: 'sans-serif' }}>捕捉您的真实底色</h2>
                    <p style={{ color: '#666', lineHeight: '2' }}>请保持正对镜头，点击金色按钮开启您的理容报告。</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ background: '#fff', borderLeft: '4px solid #D4AF37', padding: '30px', borderRadius: '0 20px 20px 0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', marginBottom: '40px' }}>
                      <p style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '2px' }}>AI SUGGESTION</p>
                      <p style={{ fontSize: '15px', fontStyle: 'italic' }}>{aiAdvice}</p>
                    </div>
                    
                    <div style={{ marginBottom: '35px' }}>
                      <p style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>TOOL SELECTION</p>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        {['brush', 'liner_shadow', 'liner_light'].map(m => (
                          <div key={m} onClick={() => setCurrentMode(m)} style={{ cursor: 'pointer', opacity: currentMode === m ? 1 : 0.3 }}>
                             <img src={m === 'brush' ? '/brush.png' : '/liner.png'} style={{ width: '55px', height: '55px', border: currentMode === m ? '2px solid #D4AF37' : '1px solid #eee', borderRadius: '12px', padding: '3px', transform: m === 'liner_light' ? 'rotate(180deg)' : 'none' }} />
                          </div>
                        ))}
                      </div>
                      {currentMode === 'brush' && (
                        <div style={{ marginTop: '25px', display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid #f9f9f9', paddingTop: '25px' }}>
                          {brushColors.shading.map(c => <div key={c} onClick={() => setSelectedColor(c)} style={{ width: '24px', height: '24px', background: c, borderRadius: '50%', cursor: 'pointer', border: selectedColor === c ? '2px solid #D4AF37' : '2px solid #fff' }} />)}
                          <div style={{ width: '1px', height: '18px', background: '#eee', margin: '0 10px' }} />
                          {brushColors.highlight.map(c => <div key={c} onClick={() => setSelectedColor(c)} style={{ width: '24px', height: '24px', background: c, borderRadius: '50%', cursor: 'pointer', border: selectedColor === c ? '2px solid #D4AF37' : '2px solid #fff' }} />)}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '45px' }}>
                       <p style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>BRUSH SIZE: {brushSize}PX</p>
                       <input type="range" min="5" max="65" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#D4AF37' }} />
                    </div>

                    <button onClick={fetchFinalPersona} disabled={isAnalyzing} style={{ width: '100%', padding: '25px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {isAnalyzing ? "ANALYZING..." : "COMPLETE PROCESS"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* Step 3: 杂志风结果页 */
            <motion.div key="s3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '450px 1fr', gap: '80px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '100px', height: '100px', borderTop: '2px solid #D4AF37', borderLeft: '2px solid #D4AF37' }}></div>
                <img src={capturedImage} style={{ width: '450px', height: '560px', objectFit: 'cover', borderRadius: '4px' }} />
                <div style={{ position: 'absolute', bottom: '40px', left: '40px', color: '#fff' }}>
                  <p style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold' }}>THE ARCHETYPE</p>
                  <h2 style={{ fontSize: '64px', margin: '10px 0', fontWeight: '300' }}>{persona.name}</h2>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div>
                  <Quote size={48} style={{ color: '#D4AF37', opacity: 0.2, marginBottom: '20px' }} />
                  <p style={{ fontSize: '22px', lineHeight: '1.8', color: '#333', fontWeight: '300' }}>{persona.desc}</p>
                </div>

                <div style={{ paddingTop: '40px', borderTop: '1px solid #EEE' }}>
                  <p style={{ fontSize: '11px', color: '#999', letterSpacing: '3px', marginBottom: '25px' }}>SIMILAR ARCHETYPE / 相似明星</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                    <img src={persona.img} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #D4AF37', padding: '4px' }} />
                    <div>
                      <h4 style={{ fontSize: '28px', margin: 0, fontWeight: '400' }}>{persona.star}</h4>
                      <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>骨相比例高度匹配</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setStep(1)} style={{ padding: '15px 40px', border: '1px solid #1A1A1A', background: 'none', borderRadius: '50px', cursor: 'pointer', fontSize: '11px', alignSelf: 'start' }}>RESTART</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}