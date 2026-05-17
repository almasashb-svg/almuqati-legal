import { useState, useRef, useEffect } from "react";

// ─── مفتاح API — يُقرأ من متغير البيئة على Vercel ────────────────────────────
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

// ─── قاعدة بيانات الأنظمة السعودية ───────────────────────────────────────────
const SAUDI_LAWS = {
  commercial: [
    { code: "م/3",   name: "نظام الشركات",                  year: "1437هـ", authority: "مجلس الوزراء" },
    { code: "م/11",  name: "نظام التجارة",                   year: "1404هـ", authority: "مجلس الوزراء" },
    { code: "م/48",  name: "نظام المحكمة التجارية",           year: "1441هـ", authority: "مجلس الوزراء" },
    { code: "م/ت/1", name: "نظام الإفلاس",                   year: "1439هـ", authority: "مجلس الوزراء" },
  ],
  labor: [
    { code: "م/51",  name: "نظام العمل",                     year: "1426هـ", authority: "مجلس الوزراء" },
    { code: "م/33",  name: "نظام التأمينات الاجتماعية",       year: "1421هـ", authority: "مجلس الوزراء" },
    { code: "م/41",  name: "نظام الضمان الصحي التعاوني",      year: "1420هـ", authority: "مجلس الوزراء" },
  ],
  property: [
    { code: "م/15",  name: "نظام التسجيل العيني للعقار",      year: "1423هـ", authority: "مجلس الوزراء" },
    { code: "م/27",  name: "نظام الإيجار",                   year: "1421هـ", authority: "مجلس الوزراء" },
    { code: "م/36",  name: "نظام التطوير العقاري",            year: "1436هـ", authority: "مجلس الوزراء" },
  ],
  data: [
    { code: "م/19",  name: "نظام حماية البيانات الشخصية",     year: "1443هـ", authority: "مجلس الوزراء" },
    { code: "م/17",  name: "نظام مكافحة الجرائم المعلوماتية", year: "1428هـ", authority: "مجلس الوزراء" },
    { code: "م/8",   name: "نظام الاتصالات",                  year: "1442هـ", authority: "مجلس الوزراء" },
  ],
  procurement: [
    { code: "م/128", name: "نظام المنافسات والمشتريات الحكومية", year: "1440هـ", authority: "مجلس الوزراء" },
    { code: "م/6",   name: "نظام الاستثمار",                  year: "1421هـ", authority: "مجلس الوزراء" },
  ],
};

const TEMPLATES = {
  contract: [
    { id: "nda",         label: "عقد سرية (NDA)",      icon: "🔒", laws: ["نظام حماية البيانات الشخصية", "نظام التجارة"] },
    { id: "employment",  label: "عقد عمل",              icon: "👔", laws: ["نظام العمل", "نظام التأمينات الاجتماعية"] },
    { id: "service",     label: "عقد خدمات",            icon: "🤝", laws: ["نظام الشركات", "نظام التجارة"] },
    { id: "sale",        label: "عقد بيع",              icon: "📜", laws: ["نظام التجارة", "نظام المحكمة التجارية"] },
    { id: "lease",       label: "عقد إيجار",            icon: "🏢", laws: ["نظام الإيجار", "نظام التسجيل العيني للعقار"] },
    { id: "partnership", label: "عقد شراكة",            icon: "⚖️", laws: ["نظام الشركات", "نظام التجارة"] },
    { id: "outsourcing", label: "عقد توريد",            icon: "📦", laws: ["نظام المنافسات والمشتريات", "نظام التجارة"] },
    { id: "consulting",  label: "عقد استشارات",         icon: "💼", laws: ["نظام التجارة", "نظام الشركات"] },
  ],
  policy: [
    { id: "hr",          label: "سياسة الموارد البشرية", icon: "👥", laws: ["نظام العمل", "نظام التأمينات"] },
    { id: "privacy",     label: "سياسة الخصوصية",       icon: "🛡️", laws: ["نظام حماية البيانات الشخصية"] },
    { id: "conduct",     label: "سياسة السلوك",         icon: "📋", laws: ["نظام العمل", "نظام الشركات"] },
    { id: "procurement", label: "سياسة المشتريات",      icon: "🏛️", laws: ["نظام المنافسات والمشتريات"] },
    { id: "compliance",  label: "سياسة الامتثال",       icon: "✅", laws: ["نظام الشركات", "نظام مكافحة الفساد"] },
    { id: "data",        label: "سياسة البيانات",       icon: "🔐", laws: ["نظام حماية البيانات الشخصية", "نظام الجرائم المعلوماتية"] },
  ],
  opinion: [
    { id: "commercial",    label: "رأي قانوني تجاري",    icon: "⚖️", laws: ["نظام الشركات", "نظام التجارة"] },
    { id: "labor",         label: "رأي قانوني عمالي",    icon: "👷", laws: ["نظام العمل"] },
    { id: "compliance_op", label: "رأي امتثال تنظيمي",   icon: "🏛️", laws: ["متعدد"] },
    { id: "property_op",   label: "رأي قانوني عقاري",    icon: "🏗️", laws: ["نظام الإيجار", "نظام العقار"] },
  ],
};

const TYPE_CONFIG = {
  contract: { label: "عقود",         icon: "📄", color: "#c9a96e" },
  policy:   { label: "سياسات",       icon: "🏛️", color: "#7eb8d4" },
  opinion:  { label: "آراء قانونية", icon: "⚖️", color: "#9b8ec4" },
};

const SYSTEM_PROMPT = `أنت مساعد قانوني ذكي متخصص في القانون السعودي، تعمل ضمن منصة المستشار القانوني الذكي لعبدالله المقاطي.

خبرتك تغطي: نظام الشركات (م/3)، نظام العمل (م/51)، نظام حماية البيانات الشخصية (م/19)، نظام المنافسات والمشتريات (م/128)، نظام الإيجار، نظام مكافحة الجرائم المعلوماتية (م/17)، أنظمة هيئة السوق المالية، نظام مكافحة غسل الأموال، لوائح هيئة الزكاة والضريبة والجمارك.

قواعد إلزامية:
1. لغة قانونية عربية رسمية واضحة ودقيقة
2. استند للنظام والمادة الصحيحة عند كل بند
3. قدّم مسودات كاملة جاهزة للاستخدام
4. ابدأ العقود بـ "بسم الله الرحمن الرحيم"
5. أضف بنود تحكيم واختصاص قضائي سعودي
6. لا تختصر — وثائق متكاملة وشاملة`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function downloadWord(content) {
  const date = new Date().toLocaleDateString("ar-SA").replace(/\//g, "-");
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><style>body{font-family:'Traditional Arabic',serif;font-size:14pt;direction:rtl;text-align:right;margin:3cm 2.5cm;line-height:2}</style></head><body dir='rtl'>${content.replace(/\n/g,"<br/>")}<br/><hr/><p style='color:#888;font-size:10pt'>أُعدّت بمساعدة منصة عبدالله المقاطي القانونية — ${date}</p></body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `وثيقة-قانونية-${date}.doc`;
  a.click();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AlMuqatiLegal() {
  const [activeTab,   setActiveTab]   = useState("generate");
  const [docType,     setDocType]     = useState("contract");
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [userInput,   setUserInput]   = useState("");
  const [reviewText,  setReviewText]  = useState("");
  const [extraCtx,    setExtraCtx]    = useState("");
  const [result,      setResult]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [copied,      setCopied]      = useState(false);
  const [lawCat,      setLawCat]      = useState("commercial");
  const [sessionCount,setSessionCount]= useState(0);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiBox,  setShowApiBox]  = useState(!API_KEY);
  const [runtimeKey,  setRuntimeKey]  = useState(API_KEY);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  async function callClaude(prompt) {
    const key = runtimeKey || apiKeyInput.trim();
    if (!key) { setError("يرجى إدخال مفتاح API أولاً."); setShowApiBox(true); return; }
    setLoading(true); setError(""); setResult("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `خطأ ${res.status}`);
      }
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      setResult(text);
      setSessionCount(c => c + 1);
    } catch (e) {
      setError("خطأ: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function buildPrompt() {
    const tpl = selectedTpl ? TEMPLATES[docType]?.find(t => t.id === selectedTpl) : null;
    const tplInfo = tpl ? `النوع: ${tpl.label}\nالأنظمة: ${tpl.laws.join("، ")}\n\n` : "";
    const ctx = extraCtx ? `\nمعلومات إضافية: ${extraCtx}` : "";
    if (activeTab === "review") {
      return `راجع ودقق هذا النص القانوني وفق القانون السعودي:\n\n${reviewText}\n\nقدّم:\n1. نقاط القوة\n2. الثغرات والمخاطر\n3. تعارض مع أنظمة سعودية محددة\n4. البنود الناقصة\n5. تحسينات مقترحة مع صياغات بديلة\n6. درجة الامتثال للأنظمة السعودية من 10`;
    }
    if (activeTab === "template") {
      return `أنشئ قالباً قانونياً احترافياً جاهزاً لـ: ${tpl?.label} وفق القانون السعودي مع حقول [...] وملاحظات {} وجميع البنود الإلزامية. الأنظمة: ${tpl?.laws?.join("، ")}. ابدأ بـ "بسم الله الرحمن الرحيم".`;
    }
    const prompts = {
      contract: `${tplInfo}أنشئ عقداً قانونياً احترافياً وكاملاً وفق القانون السعودي:\n${userInput}${ctx}\n\nيشمل: ديباجة - أطراف - تعريفات - موضوع - الالتزامات - المقابل المالي - الضمانات - السرية - الإنهاء - حل النزاعات - الاختصاص القضائي السعودي - أحكام ختامية.`,
      policy:   `${tplInfo}أنشئ سياسة مؤسسية قانونية شاملة وفق الأنظمة السعودية:\n${userInput}${ctx}\n\nتشمل: الغرض - النطاق - التعريفات - المبادئ - الإجراءات التفصيلية - المسؤوليات - الجزاءات - مراجعة السياسة.`,
      opinion:  `${tplInfo}أعدّ رأياً قانونياً احترافياً وفق القانون السعودي حول:\n${userInput}${ctx}\n\nيشمل: السؤال القانوني - الإطار المرجعي - التحليل المفصّل - الاستثناءات والمخاطر - الخلاصة والتوصيات. وثّق كل موقف بالنظام والمادة.`,
    };
    return prompts[docType];
  }

  const canSubmit = !loading && (
    (activeTab === "generate" && userInput.trim()) ||
    (activeTab === "review"   && reviewText.trim()) ||
    (activeTab === "template" && selectedTpl)
  );

  // ── styles ──
  const S = {
    app: { minHeight:"100vh", background:"#0c0b12", direction:"rtl", color:"#e8dfc8", fontFamily:"'Amiri','Georgia',serif" },
    topBar: { height:3, background:"linear-gradient(90deg,transparent,#c9a96e,#7eb8d4,#c9a96e,transparent)" },
    header: { background:"linear-gradient(180deg,#13101e,#0c0b12)", borderBottom:"1px solid #c9a96e1a", padding:"24px 32px" },
    headerInner: { maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 },
    logo: { width:54, height:54, background:"linear-gradient(135deg,#c9a96e,#8b6914,#5c4510)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, boxShadow:"0 6px 28px #c9a96e44" },
    nameEn: { fontSize:11, color:"#c9a96e88", fontFamily:"'Cairo',sans-serif", letterSpacing:2, marginTop:3 },
    nameAr: { fontSize:22, fontWeight:800, fontFamily:"'Cairo',sans-serif", background:"linear-gradient(135deg,#e8d5a8,#c9a96e)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
    pill: { display:"flex", alignItems:"center", gap:6, padding:"5px 14px", borderRadius:20, background:"#0d1f0d", border:"1px solid #4ade8033", fontSize:11, color:"#4ade80", fontFamily:"'Cairo',sans-serif" },
    dot: { width:7, height:7, borderRadius:"50%", background:"#4ade80" },
    nav: { maxWidth:1100, margin:"0 auto", padding:"0 32px", display:"flex", gap:2, borderBottom:"1px solid #c9a96e12" },
    navBtn: (active) => ({ padding:"11px 20px", border:"none", cursor:"pointer", fontFamily:"'Cairo',sans-serif", fontSize:13, fontWeight:600, background: active ? "#c9a96e10" : "transparent", color: active ? "#c9a96e" : "#555", borderBottom: active ? "2px solid #c9a96e" : "2px solid transparent", borderRadius:"8px 8px 0 0", transition:"all .2s", display:"flex", alignItems:"center", gap:6 }),
    main: { maxWidth:1100, margin:"0 auto", padding:"32px 32px" },
    label: { fontSize:11, color:"#c9a96e66", fontFamily:"'Cairo',sans-serif", fontWeight:700, letterSpacing:2, marginBottom:12, display:"block" },
    typeRow: { display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" },
    typeBtn: (active, color) => ({ flex:1, minWidth:140, padding:"12px 20px", borderRadius:12, border: active ? `1px solid ${color}` : "1px solid #c9a96e18", background: active ? `${color}15` : "#13101e", color: active ? color : "#555", fontFamily:"'Cairo',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all .2s", display:"flex", alignItems:"center", gap:8, justifyContent:"center", boxShadow: active ? `0 4px 20px ${color}22` : "none" }),
    tplGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:10, marginBottom:22 },
    tplCard: (active) => ({ padding:"14px 16px", borderRadius:12, cursor:"pointer", textAlign:"right", border: active ? "1px solid #c9a96e" : "1px solid #c9a96e15", background: active ? "#c9a96e12" : "#13101e", transition:"all .2s" }),
    textarea: { width:"100%", padding:"16px 18px", borderRadius:12, border:"1px solid #c9a96e22", background:"#13101e", color:"#e8dfc8", fontFamily:"'Cairo',sans-serif", fontSize:14, lineHeight:1.9, resize:"vertical", transition:"all .2s", display:"block" },
    textareaSub: { width:"100%", padding:"13px 18px", borderRadius:12, border:"1px solid #c9a96e12", background:"#0f0d18", color:"#7a7060", fontFamily:"'Cairo',sans-serif", fontSize:13, lineHeight:1.8, resize:"vertical", display:"block", marginTop:10 },
    actionBtn: (ok) => ({ width:"100%", padding:"15px 24px", borderRadius:14, border:"none", cursor: ok ? "pointer" : "not-allowed", background: ok ? "linear-gradient(135deg,#c9a96e,#8b6914)" : "#1a1826", color: ok ? "#0c0b12" : "#3a3550", fontFamily:"'Cairo',sans-serif", fontSize:16, fontWeight:800, transition:"all .25s", letterSpacing:.5, boxShadow: ok ? "0 6px 24px #c9a96e33" : "none", marginBottom:28, marginTop:8 }),
    resultBox: { padding:"32px 36px", background:"#13101e", color:"#e0d5c0", fontFamily:"'Amiri',serif", fontSize:16, lineHeight:2.1, whiteSpace:"pre-wrap", direction:"rtl", maxHeight:560, overflowY:"auto" },
    iconBtn: { padding:"8px 18px", borderRadius:8, border:"1px solid #c9a96e33", background:"transparent", color:"#c9a96e", cursor:"pointer", fontFamily:"'Cairo',sans-serif", fontSize:12, fontWeight:600, transition:"all .2s" },
  };

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes dotP{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
        .dot1{animation:dotP 1.2s ease-in-out .0s infinite}
        .dot2{animation:dotP 1.2s ease-in-out .2s infinite}
        .dot3{animation:dotP 1.2s ease-in-out .4s infinite}
        .nav-t:hover{color:#c9a96e!important}
        .tpl-c:hover{border-color:#c9a96e66!important;background:#1e1a2e!important}
        .act-b:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px #c9a96e44!important}
        .icon-b:hover{background:#c9a96e18!important}
        .law-c:hover{border-color:#c9a96e!important;background:#c9a96e12!important}
        textarea:focus{outline:none;border-color:#c9a96e55!important;box-shadow:0 0 0 3px #c9a96e0f!important}
        input:focus{outline:none}
      `}</style>

      {/* Top accent line */}
      <div style={S.topBar} />

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={S.logo}>⚖️</div>
            <div>
              <div style={S.nameAr}>عبدالله المقاطي</div>
              <div style={S.nameEn}>AL-MUQATI LEGAL INTELLIGENCE PLATFORM</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:20, alignItems:"center" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:800, color:"#c9a96e", fontFamily:"'Cairo',sans-serif" }}>{sessionCount}</div>
              <div style={{ fontSize:10, color:"#444", fontFamily:"'Cairo',sans-serif" }}>وثيقة اليوم</div>
            </div>
            <div style={{ width:1, height:32, background:"#c9a96e15" }} />
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:800, color:"#7eb8d4", fontFamily:"'Cairo',sans-serif" }}>15+</div>
              <div style={{ fontSize:10, color:"#444", fontFamily:"'Cairo',sans-serif" }}>نظام سعودي</div>
            </div>
            <div style={{ width:1, height:32, background:"#c9a96e15" }} />
            <div style={S.pill}>
              <div style={{ ...S.dot, animation:"pulse 2s infinite" }} />
              متصل
            </div>
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={S.nav}>
        {[
          { id:"generate", label:"توليد وثيقة",   icon:"✦" },
          { id:"review",   label:"مراجعة وتدقيق", icon:"🔍" },
          { id:"template", label:"قوالب جاهزة",   icon:"📋" },
          { id:"laws",     label:"مرجع الأنظمة",  icon:"📚" },
        ].map(tab => (
          <button key={tab.id} className="nav-t"
            onClick={() => { setActiveTab(tab.id); setResult(""); setError(""); }}
            style={S.navBtn(activeTab === tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={S.main}>

        {/* API Key box (shown when no key configured) */}
        {showApiBox && (
          <div style={{ marginBottom:24, padding:"18px 20px", borderRadius:12, background:"#1a1000", border:"1px solid #c9a96e33", animation:"fadeUp .4s ease" }}>
            <div style={{ fontFamily:"'Cairo',sans-serif", fontSize:13, color:"#c9a96e", fontWeight:700, marginBottom:10 }}>
              🔑 أدخل مفتاح Anthropic API
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{ flex:1, padding:"10px 14px", borderRadius:8, border:"1px solid #c9a96e33", background:"#0f0d18", color:"#e8dfc8", fontFamily:"'Cairo',sans-serif", fontSize:13 }}
              />
              <button
                onClick={() => { setRuntimeKey(apiKeyInput.trim()); setShowApiBox(false); }}
                style={{ padding:"10px 20px", borderRadius:8, border:"none", background:"#c9a96e", color:"#0c0b12", fontFamily:"'Cairo',sans-serif", fontWeight:700, cursor:"pointer" }}>
                حفظ
              </button>
            </div>
            <div style={{ fontFamily:"'Cairo',sans-serif", fontSize:11, color:"#666", marginTop:8 }}>
              احصل على مفتاحك من: console.anthropic.com — يُحفظ في الجلسة فقط ولا يُرسل لأي جهة غير Anthropic
            </div>
          </div>
        )}

        {/* ── LAWS TAB ── */}
        {activeTab === "laws" && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <div style={{ marginBottom:22 }}>
              <h2 style={{ fontFamily:"'Cairo',sans-serif", fontSize:18, fontWeight:700, color:"#e8d5a8" }}>مرجع الأنظمة السعودية</h2>
              <p style={{ fontFamily:"'Cairo',sans-serif", fontSize:13, color:"#555", marginTop:6 }}>قاعدة بيانات الأنظمة واللوائح المعمول بها في المملكة العربية السعودية</p>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
              {[
                { id:"commercial",  label:"تجاري وشركات" },
                { id:"labor",       label:"عمل وتأمينات" },
                { id:"property",    label:"عقاري" },
                { id:"data",        label:"بيانات وتقنية" },
                { id:"procurement", label:"مشتريات واستثمار" },
              ].map(c => (
                <button key={c.id} className="law-c" onClick={() => setLawCat(c.id)}
                  style={{ padding:"8px 18px", borderRadius:20, cursor:"pointer", fontFamily:"'Cairo',sans-serif", fontSize:13, transition:"all .2s", border: lawCat===c.id ? "1px solid #c9a96e" : "1px solid #c9a96e1a", background: lawCat===c.id ? "#c9a96e18" : "#13101e", color: lawCat===c.id ? "#c9a96e" : "#666" }}>
                  {c.label}
                </button>
              ))}
            </div>
            <div style={{ display:"grid", gap:10 }}>
              {SAUDI_LAWS[lawCat]?.map((law, i) => (
                <div key={i} style={{ padding:"18px 22px", borderRadius:13, background:"linear-gradient(135deg,#16131f,#1a1628)", border:"1px solid #c9a96e1a", display:"flex", alignItems:"center", gap:18 }}>
                  <div style={{ minWidth:52, height:52, borderRadius:12, background:"#c9a96e12", border:"1px solid #c9a96e28", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cairo',sans-serif", fontSize:11, color:"#c9a96e", fontWeight:700, textAlign:"center", padding:4 }}>{law.code}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Cairo',sans-serif", fontSize:15, fontWeight:700, color:"#e8d5a8" }}>{law.name}</div>
                    <div style={{ fontFamily:"'Cairo',sans-serif", fontSize:12, color:"#555", marginTop:4 }}>{law.authority} • {law.year}</div>
                  </div>
                  <div style={{ fontSize:10, color:"#4ade8088", fontFamily:"'Cairo',sans-serif", padding:"3px 10px", borderRadius:10, background:"#0d1f0d", border:"1px solid #4ade8022" }}>ساري</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GENERATE / TEMPLATE TABS ── */}
        {(activeTab === "generate" || activeTab === "template") && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <span style={S.label}>نوع الوثيقة</span>
            <div style={S.typeRow}>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => { setDocType(key); setSelectedTpl(null); setResult(""); }}
                  style={S.typeBtn(docType===key, cfg.color)}>
                  <span style={{ fontSize:20 }}>{cfg.icon}</span>{cfg.label}
                </button>
              ))}
            </div>

            <span style={S.label}>{activeTab==="template" ? "اختر القالب المطلوب" : "القوالب المتاحة (اختياري)"}</span>
            <div style={S.tplGrid}>
              {TEMPLATES[docType]?.map(tpl => (
                <button key={tpl.id} className="tpl-c" onClick={() => setSelectedTpl(selectedTpl===tpl.id ? null : tpl.id)}
                  style={S.tplCard(selectedTpl===tpl.id)}>
                  <div style={{ fontSize:22, marginBottom:8 }}>{tpl.icon}</div>
                  <div style={{ fontFamily:"'Cairo',sans-serif", fontSize:13, fontWeight:600, color: selectedTpl===tpl.id ? "#c9a96e" : "#aaa", marginBottom:6 }}>{tpl.label}</div>
                  <span style={{ fontSize:9, color:"#c9a96e55", fontFamily:"'Cairo',sans-serif", background:"#c9a96e08", padding:"2px 8px", borderRadius:10 }}>{tpl.laws[0]}</span>
                </button>
              ))}
            </div>

            {activeTab === "generate" && (
              <>
                <span style={S.label}>تفاصيل الوثيقة المطلوبة</span>
                <textarea value={userInput} onChange={e => setUserInput(e.target.value)} style={{ ...S.textarea, minHeight:120 }}
                  placeholder={docType==="contract" ? "مثال: عقد خدمات تقنية بين شركة الفارس (الطرف الأول) وشركة النور (الطرف الثاني)، مدة سنة، قيمة 500,000 ريال سعودي..." : docType==="policy" ? "مثال: سياسة العمل عن بُعد لشركة سعودية، تشمل أحكام الدوام والتواصل والأدوات المعتمدة..." : "مثال: رأي قانوني حول إنهاء عقد موظف في فترة التجربة ومدى أحقيته في مكافأة نهاية الخدمة..."} />
                <textarea value={extraCtx} onChange={e => setExtraCtx(e.target.value)} style={{ ...S.textareaSub, minHeight:64 }}
                  placeholder="معلومات تكميلية: قطاع العمل، شروط خاصة، تحفظات... (اختياري)" />
              </>
            )}
          </div>
        )}

        {/* ── REVIEW TAB ── */}
        {activeTab === "review" && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <span style={S.label}>النص القانوني للمراجعة</span>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} style={{ ...S.textarea, minHeight:220 }}
              placeholder="الصق هنا النص القانوني الذي تريد مراجعته وتدقيقه وفق الأنظمة السعودية المعمول بها..." />
          </div>
        )}

        {/* Action Button */}
        {activeTab !== "laws" && (
          <button className="act-b" disabled={!canSubmit} onClick={() => callClaude(buildPrompt())} style={S.actionBtn(canSubmit)}>
            {loading
              ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <span className="dot1" style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:"#c9a96e" }} />
                  <span className="dot2" style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:"#c9a96e" }} />
                  <span className="dot3" style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:"#c9a96e" }} />
                </span>
              : activeTab==="generate" ? "✦ توليد الوثيقة القانونية"
              : activeTab==="review"   ? "🔍 مراجعة وتدقيق النص"
              :                          "📋 إنشاء القالب القانوني"}
          </button>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding:"14px 18px", borderRadius:10, background:"#1f0808", border:"1px solid #ff444422", color:"#ff9999", fontFamily:"'Cairo',sans-serif", fontSize:13, marginBottom:20 }}>
            ⚠ {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div ref={resultRef} style={{ animation:"fadeUp .5s ease" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80", animation:"pulse 1.5s infinite" }} />
                <span style={{ fontFamily:"'Cairo',sans-serif", fontSize:14, fontWeight:700, color:"#c9a96e" }}>الوثيقة القانونية جاهزة</span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="icon-b" onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(()=>setCopied(false),2000); }} style={S.iconBtn}>
                  {copied ? "✓ تم النسخ" : "نسخ النص"}
                </button>
                <button className="icon-b" onClick={() => downloadWord(result)} style={{ ...S.iconBtn, background:"#c9a96e18" }}>
                  ⬇ تحميل Word
                </button>
                <button className="icon-b" onClick={() => { setResult(""); setUserInput(""); setReviewText(""); setSelectedTpl(null); }} style={{ ...S.iconBtn, color:"#555", border:"1px solid #2a2830" }}>
                  وثيقة جديدة
                </button>
              </div>
            </div>

            <div style={{ borderRadius:14, overflow:"hidden", border:"1px solid #c9a96e1a", boxShadow:"0 20px 60px #00000055" }}>
              <div style={{ padding:"12px 22px", background:"linear-gradient(135deg,#1a1628,#16131f)", borderBottom:"1px solid #c9a96e15", display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:"#c9a96e" }} />
                <div style={{ width:9, height:9, borderRadius:"50%", background:"#7eb8d433" }} />
                <div style={{ width:9, height:9, borderRadius:"50%", background:"#9b8ec433" }} />
                <span style={{ fontSize:11, color:"#444", fontFamily:"'Cairo',sans-serif", marginRight:12 }}>
                  وثيقة قانونية • عبدالله المقاطي • {new Date().toLocaleDateString("ar-SA")}
                </span>
              </div>
              <div style={S.resultBox}>{result}</div>
            </div>

            <div style={{ marginTop:10, padding:"10px 16px", borderRadius:8, background:"#16100a", border:"1px solid #c9a96e12" }}>
              <p style={{ fontFamily:"'Cairo',sans-serif", fontSize:11, color:"#555", lineHeight:1.7 }}>
                ⚖ هذه الوثيقة أُعدّت بمساعدة الذكاء الاصطناعي استناداً للأنظمة السعودية. يُوصى بمراجعة متخصص قانوني معتمد قبل استخدامها رسمياً.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
