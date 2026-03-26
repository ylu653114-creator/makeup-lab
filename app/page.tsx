"use client";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 1. 成果展示渐变组件 (Before & After) ---
function ResultShowcase({ faceShape }: { faceShape: string }) {
  const [showFinished, setShowFinished] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowFinished(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ position: 'relative', width: '450px', height: '450px', borderRadius: '32px', overflow: 'hidden', border: '1px solid #D4AF37', boxShadow: '0 30px 60px rgba(212,175,55,0.15)' }}>
      <img src={`/${faceShape}.png`} alt="Original" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <motion.img 
        src={`/${faceShape}-finished.png`} 
        alt="Finished"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: showFinished ? 1 : 0 }}
        transition={{ duration: 2.8, ease: "easeInOut" }}
      />
      <div style={{ position: 'absolute', bottom: '25px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(26,26,26,0.85)', color: '#D4AF37', padding: '8px 20px', borderRadius: '30px', fontSize: '11px', letterSpacing: '3px', whiteSpace: 'nowrap', backdropFilter: 'blur(5px)' }}>
        {showFinished ? "理容蜕变已达成" : "正在生成对比报告..."}
      </div>
    </div>
  );
}

// --- 2. 核心 Canvas 组件 (带撤回功能) ---
function ProfessionalCanvas({ faceShape, toolConfig, undoTrigger }: { 
  faceShape: string, toolConfig: any, undoTrigger: number 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const historyRef = useRef<ImageData[]>([]); 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = `/${faceShape}.png`; 
    img.onload = () => {
      ctx.clearRect(0, 0, 450, 450);
      ctx.drawImage(img, 0, 0, 450, 450);
      historyRef.current = [ctx.getImageData(0, 0, 450, 450)];
    };
  }, [faceShape]);

  useEffect(() => {
    if (undoTrigger === 0) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && historyRef.current.length > 1) {
      historyRef.current.pop();
      const previousState = historyRef.current[historyRef.current.length - 1];
      ctx.putImageData(previousState, 0, 0);
    }
  }, [undoTrigger]);

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const rect = canvas?.getBoundingClientRect();
    if (!ctx || !rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, toolConfig.size);
    const alpha = Math.floor(toolConfig.opacity * 255).toString(16).padStart(2, '0');
    gradient.addColorStop(0, `${toolConfig.color}${alpha}`);
    gradient.addColorStop(1, `${toolConfig.color}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, toolConfig.size, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div style={{ padding: '10px', background: '#fff', borderRadius: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', border: '1px solid #E5E5E1' }}>
      <canvas
        ref={canvasRef}
        width={450}
        height={450}
        onMouseDown={() => setIsDrawing(true)}
        onMouseUp={() => {
          setIsDrawing(false);
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) historyRef.current.push(ctx.getImageData(0, 0, 450, 450));
        }}
        onMouseMove={draw}
        style={{ borderRadius: '24px', cursor: 'crosshair', background: '#FDFDFB', display: 'block' }}
      />
    </div>
  );
}

// --- 3. 游戏主逻辑 ---
export default function MakeupGame() {
  const [mounted, setMounted] = useState(false); // 核心修复：防止水合报错
  const [step, setStep] = useState(1);
  const [faceShape, setFaceShape] = useState('round');
  const [undoCounter, setUndoCounter] = useState(0); 
  const [brushSize, setBrushSize] = useState(24);
  const [aiAdvice, setAiAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState('brush');
  const [selectedColor, setSelectedColor] = useState('#5D4037');

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  const brushColors = {
    shading: ['#5D4037', '#8D6E63', '#A1887F'], 
    highlight: ['#FFF9C4', '#FEF3C7', '#FFFFFF'] 
  };

  const fetchAiAdvice = async (shape: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/makeup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceShape: shape }),
      });
      const data = await res.json();
      setAiAdvice(data.advice || "建议：针对当前面型，请于轮廓处少量多次叠涂。");
    } catch {
      setAiAdvice("建议：沿面部轮廓少量多次涂抹阴影，在受光面使用柔和提亮。");
    }
    setLoading(false);
  };

  const toolModes: any = {
    brush: { color: selectedColor, opacity: 0.05, label: '理容刷' },
    liner_shadow: { color: '#8D6E63', opacity: 0.07, label: '卧蚕笔(阴)' },
    liner_light: { color: '#FFF9C4', opacity: 0.10, label: '卧蚕笔(提)' }
  };

  if (!mounted) return null; // 还没挂载时不渲染任何内容，避开报错

  return (
    <div style={{ minHeight: '100vh', background: '#FDFDFB', color: '#1A1A1A', fontFamily: 'sans-serif', padding: '40px' }}>
      
      {/* Header */}
      <header style={{ maxWidth: '1100px', margin: '0 auto 60px', borderBottom: '1px solid #E5E5E1', paddingBottom: '25px' }}>
        <h1 style={{ letterSpacing: '0.4em', fontSize: '22px', fontWeight: 'bold', color: '#1A1A1A' }}>LABORATORY <span style={{ color: '#D4AF37' }}>0.1</span></h1>
      </header>

      <section style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '470px 1fr', gap: '80px' }}>
        
        {/* 左侧区域：Canvas & Undo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', alignItems: 'center' }}>
          {step === 1 ? (
            <div style={{ width: '470px', height: '470px', border: '1px solid #E5E5E1', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '11px', letterSpacing: '2px' }}>WAITING FOR SELECTION</div>
          ) : step === 6 ? (
            <ResultShowcase faceShape={faceShape} />
          ) : (
            <>
              <ProfessionalCanvas faceShape={faceShape} toolConfig={{ ...toolModes[currentMode], size: brushSize }} undoTrigger={undoCounter} />
              <button 
                onClick={() => setUndoCounter(prev => prev + 1)} 
                style={{ fontSize: '11px', color: '#D4AF37', background: 'white', padding: '12px 35px', borderRadius: '40px', border: '1px solid #D4AF37', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(212,175,55,0.1)' }}
              >
                UNDO LAST STROKE ↩️
              </button>
            </>
          )}
        </div>

        {/* 右侧：控制面板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 style={{ fontSize: '28px', fontWeight: '300', marginBottom: '35px', letterSpacing: '-1px' }}>选择你的基础面型</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {['round', 'square', 'oval', 'heart'].map(s => (
                    <button key={s} onClick={() => { setFaceShape(s); setStep(2); fetchAiAdvice(s); }} style={{ padding: '35px 20px', background: '#fff', border: '1px solid #E5E5E1', borderRadius: '20px', cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '12px', transition: '0.3s' }}>{s} Shape</button>
                  ))}
                </div>
              </motion.div>
            ) : step >= 2 && step <= 5 ? (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {/* AI Advice Panel */}
                <div style={{ background: '#fff', borderLeft: '3px solid #D4AF37', padding: '25px', borderRadius: '0 20px 20px 0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', marginBottom: '35px' }}>
                  <p style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '0.2em' }}>AI EXPERT ADVICE</p>
                  <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#444', fontStyle: 'italic' }}>{loading ? "分析中..." : aiAdvice}</p>
                </div>

                {/* Toolbox */}
                <div style={{ marginBottom: '35px' }}>
                  <p style={{ fontSize: '11px', color: '#999', marginBottom: '15px', letterSpacing: '0.1em' }}>TOOL SELECTION</p>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {['brush', 'liner_shadow', 'liner_light'].map(m => (
                      <div key={m} onClick={() => setCurrentMode(m)} style={{ cursor: 'pointer', transition: '0.3s', opacity: currentMode === m ? 1 : 0.3 }}>
                         <img src={m === 'brush' ? '/brush.png' : '/liner.png'} alt={m} style={{ width: '55px', height: '55px', border: currentMode === m ? '2px solid #D4AF37' : '1px solid #eee', borderRadius: '12px', padding: '3px', transform: m === 'liner_light' ? 'rotate(180deg)' : 'none' }} />
                      </div>
                    ))}
                  </div>
                  {currentMode === 'brush' && (
                    <div style={{ marginTop: '25px', display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid #f9f9f9', paddingTop: '25px' }}>
                      {brushColors.shading.map(c => <div key={c} onClick={() => setSelectedColor(c)} style={{ width: '24px', height: '24px', background: c, borderRadius: '50%', cursor: 'pointer', border: selectedColor === c ? '2px solid #D4AF37' : '2px solid #fff', transition: '0.2s' }} />)}
                      <div style={{ width: '1px', height: '18px', background: '#eee', margin: '0 10px' }} />
                      {brushColors.highlight.map(c => <div key={c} onClick={() => setSelectedColor(c)} style={{ width: '24px', height: '24px', background: c, borderRadius: '50%', cursor: 'pointer', border: selectedColor === c ? '2px solid #D4AF37' : '2px solid #fff', transition: '0.2s' }} />)}
                    </div>
                  )}
                </div>

                {/* Slider */}
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999', marginBottom: '12px', letterSpacing: '1px' }}>
                     <span>BRUSH SIZE</span>
                     <span>{brushSize}PX</span>
                  </div>
                  <input type="range" min="5" max="65" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: '#D4AF37' }} />
                </div>

                <button onClick={() => setStep(6)} style={{ width: '100%', padding: '22px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '18px', letterSpacing: '0.25em', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}>FINAL PROCESS</button>
              </motion.div>
            ) : (
              <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 style={{ color: '#D4AF37', fontSize: '32px', fontWeight: '300', letterSpacing: '-1px' }}>理容已达成</h2>
                <p style={{ margin: '25px 0 40px', color: '#666', lineHeight: '1.9', fontSize: '15px' }}>模拟已完成。左侧影像记录了从初始面态到理容后的完整蜕变轨迹，通过光影微调展现了男士理容的利落质感。</p>
                <button onClick={() => {setStep(1); setUndoCounter(0);}} style={{ padding: '18px 60px', borderRadius: '50px', background: '#1A1A1A', color: '#fff', cursor: 'pointer', border: 'none', fontWeight: 'bold', letterSpacing: '2px' }}>RESTART</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}