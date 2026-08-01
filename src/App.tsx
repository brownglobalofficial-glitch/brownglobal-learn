import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { fallbackCourses, fallbackSessions, pathways, type Course, type LiveSession } from "./data";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type View = "home" | "catalog" | "live" | "challenge" | "series" | "dashboard" | "pricing";
type AuthMode = "signin" | "signup";
type NoticeTone = "success" | "error" | "info";
type Notice = { tone: NoticeTone; text: string } | null;

const views: { key: View; label: string }[] = [
  { key: "catalog", label: "Courses" },
  { key: "live", label: "Live" },
  { key: "challenge", label: "Build Challenge" },
  { key: "series", label: "Wave Series" },
  { key: "pricing", label: "Plans" },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

export default function App() {
  const [view, setView] = useState<View>(() => (window.location.hash.replace("#", "") as View) || "home");
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [notice, setNotice] = useState<Notice>(null);
  const [courses, setCourses] = useState<Course[]>(fallbackCourses);
  const [sessions, setSessions] = useState<LiveSession[]>(fallbackSessions);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [registeredSessionIds, setRegisteredSessionIds] = useState<string[]>([]);
  const [hasPlus, setHasPlus] = useState(false);
  const [plusSource, setPlusSource] = useState<"business" | "plus" | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const go = (next: View) => {
    window.location.hash = next;
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tell = (tone: NoticeTone, text: string) => {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice(null), 5200);
  };

  useEffect(() => {
    const onHash = () => setView((window.location.hash.replace("#", "") as View) || "home");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const loadPublic = async () => {
      const [courseResult, liveResult, challengeResult] = await Promise.all([
        client.from("learning_courses").select("id,slug,title,description,school,level,duration_label,access,color,estimated_lessons").eq("published", true).order("sort_order"),
        client.from("learning_live_sessions").select("id,title,instructor_name,starts_at,duration_minutes,access,session_type,language").eq("published", true).gte("starts_at", new Date().toISOString()).order("starts_at"),
        client.from("learning_challenges").select("id").eq("slug", "build-a-business").eq("published", true).maybeSingle(),
      ]);
      if (courseResult.data?.length) {
        setCourses(courseResult.data.map((row) => ({ id: row.id, slug: row.slug, title: row.title, description: row.description, school: row.school, level: row.level, duration: row.duration_label, access: row.access, color: row.color, lessons: row.estimated_lessons })));
      }
      if (liveResult.data?.length) {
        setSessions(liveResult.data.map((row) => ({ id: row.id, title: row.title, instructor: row.instructor_name, startsAt: row.starts_at, durationMinutes: row.duration_minutes, access: row.access, kind: row.session_type, language: row.language })));
      }
      if (challengeResult.data) setChallengeId(challengeResult.data.id);
    };
    loadPublic();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setEnrolledIds([]);
      setRegisteredSessionIds([]);
      setHasPlus(false);
      setPlusSource(null);
      setSubmissionId(null);
      return;
    }
    const client = supabase;
    const userId = session.user.id;
    const loadPrivate = async () => {
      const [enrollments, registrations, personalPlan, businessPlan, submission] = await Promise.all([
        client.from("learning_enrollments").select("course_id").eq("user_id", userId),
        client.from("learning_live_registrations").select("session_id").eq("user_id", userId),
        client.from("learning_subscriptions").select("plan,status").eq("user_id", userId).in("status", ["active", "trialing"]).maybeSingle(),
        client.from("business_memberships").select("plan,status").eq("plan", "business").in("status", ["active", "trialing"]).limit(1),
        challengeId ? client.from("learning_challenge_submissions").select("id").eq("user_id", userId).eq("challenge_id", challengeId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setEnrolledIds(enrollments.data?.map((item) => item.course_id) ?? []);
      setRegisteredSessionIds(registrations.data?.map((item) => item.session_id) ?? []);
      if (businessPlan.data?.length) {
        setHasPlus(true);
        setPlusSource("business");
      } else if (personalPlan.data?.plan === "plus") {
        setHasPlus(true);
        setPlusSource("plus");
      } else {
        setHasPlus(false);
        setPlusSource(null);
      }
      setSubmissionId(submission.data?.id ?? null);
    };
    loadPrivate();
  }, [session, challengeId]);

  const requireAccount = () => {
    if (session) return true;
    setAuthMode("signup");
    setAuthOpen(true);
    tell("info", "Create your free account to continue.");
    return false;
  };

  const enroll = async (course: Course) => {
    if (!requireAccount()) return;
    if (course.access === "plus" && !hasPlus) {
      go("pricing");
      tell("info", "This course is included with Learn Plus and BrownGlobal Business.");
      return;
    }
    if (!supabase || !session) return tell("info", "Enrollment will activate when the shared BrownGlobal backend is connected.");
    if (enrolledIds.includes(course.id)) {
      go("dashboard");
      tell("info", `${course.title} is ready in your learning dashboard.`);
      return;
    }
    const { error } = await supabase.from("learning_enrollments").insert({ user_id: session.user.id, course_id: course.id });
    if (error) return tell("error", error.message);
    setEnrolledIds((current) => [...new Set([...current, course.id])]);
    tell("success", `You are enrolled in ${course.title}.`);
  };

  const registerLive = async (item: LiveSession) => {
    if (!requireAccount()) return;
    if (item.access === "plus" && !hasPlus) {
      go("pricing");
      tell("info", "This interactive session is included with Learn Plus and BrownGlobal Business.");
      return;
    }
    if (!supabase || !session) return tell("info", "Registration will activate when the shared BrownGlobal backend is connected.");
    if (registeredSessionIds.includes(item.id)) return tell("info", "This class is already reserved in your dashboard.");
    const { error } = await supabase.from("learning_live_registrations").insert({ user_id: session.user.id, session_id: item.id });
    if (error) return tell("error", error.message);
    setRegisteredSessionIds((current) => [...new Set([...current, item.id])]);
    tell("success", "Your place is reserved. The online access link will appear in your dashboard before class.");
  };

  const enrolledCourses = useMemo(() => courses.filter((course) => enrolledIds.includes(course.id)), [courses, enrolledIds]);

  return (
    <div className="app-shell">
      <Header view={view} go={go} session={session} hasPlus={hasPlus} onAuth={() => { setAuthMode("signin"); setAuthOpen(true); }} onSignOut={async () => { await supabase?.auth.signOut(); tell("success", "You have signed out."); go("home"); }} />
      {notice && <div className={`notice ${notice.tone}`} role="status">{notice.text}</div>}
      {!isSupabaseConfigured && <div className="environment-note">Product preview • the shared BrownGlobal account connection is being prepared.</div>}
      {view === "home" && <Home go={go} courses={courses} />}
      {view === "catalog" && <Catalog courses={courses} enrolledIds={enrolledIds} hasPlus={hasPlus} enroll={enroll} />}
      {view === "live" && <Live sessions={sessions} registeredIds={registeredSessionIds} register={registerLive} />}
      {view === "challenge" && <Challenge session={session} challengeId={challengeId} submissionId={submissionId} requireAccount={requireAccount} tell={tell} onSubmitted={setSubmissionId} go={go} />}
      {view === "series" && <Series session={session} submissionId={submissionId} requireAccount={requireAccount} tell={tell} go={go} />}
      {view === "dashboard" && <Dashboard session={session} enrolledCourses={enrolledCourses} sessions={sessions.filter((item) => registeredSessionIds.includes(item.id))} hasPlus={hasPlus} plusSource={plusSource} go={go} onAuth={() => { setAuthMode("signin"); setAuthOpen(true); }} />}
      {view === "pricing" && <Pricing session={session} go={go} onAuth={() => { setAuthMode("signup"); setAuthOpen(true); }} tell={tell} />}
      <Footer go={go} />
      {authOpen && <AuthDialog mode={authMode} setMode={setAuthMode} close={() => setAuthOpen(false)} tell={tell} />}
    </div>
  );
}

function Header({ view, go, session, hasPlus, onAuth, onSignOut }: { view: View; go: (view: View) => void; session: Session | null; hasPlus: boolean; onAuth: () => void; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  return <header className="topbar">
    <button className="brand" onClick={() => go("home")} aria-label="Learn home"><img src="/learn-logo.svg" alt=""/><span><strong>learn</strong><small>by BrownGlobal</small></span></button>
    <button className="menu" onClick={() => setOpen(!open)} aria-controls="learn-navigation" aria-expanded={open}>{open ? "Close" : "Menu"}</button>
    <nav id="learn-navigation" className={open ? "open" : ""} aria-label="Primary navigation">{views.map((item) => <button className={view === item.key ? "active" : ""} key={item.key} onClick={() => { go(item.key); setOpen(false); }}>{item.label}</button>)}{session && <button className={view === "dashboard" ? "active mobile-dashboard-link" : "mobile-dashboard-link"} onClick={() => { go("dashboard"); setOpen(false); }}>My learning</button>}</nav>
    <div className="account-actions">{hasPlus && <span className="plan-chip">PLUS</span>}{session ? <><button className="text-button" onClick={() => go("dashboard")}>My learning</button><button className="button compact secondary" onClick={onSignOut}>Sign out</button></> : <button className="button compact" onClick={onAuth}>Sign in</button>}</div>
  </header>;
}

function Home({ go, courses }: { go: (view: View) => void; courses: Course[] }) {
  return <main>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow">Practical learning, built around action</span><h1>Learn it.<br/><em>Build something real.</em></h1><p>Serious online classes for business, technology, marketing, media and leadership—with projects that prove what you can do.</p><div className="hero-actions"><button className="button light" onClick={() => go("catalog")}>Explore free courses <span>→</span></button><button className="text-link" onClick={() => go("live")}>See live classes</button></div><div className="hero-proof"><div><strong>100%</strong><span>online</span></div><div><strong>Free</strong><span>to begin</span></div><div><strong>Real</strong><span>project work</span></div></div></div>
      <div className="hero-system" aria-label="Learn, build, prove, compete pathway"><div className="orbit one"/><div className="orbit two"/><div className="center-mark"><img src="/learn-logo.svg" alt="Learn icon"/></div>{["LEARN","BUILD","PROVE","COMPETE"].map((label, index) => <span className={`orbit-label p${index + 1}`} key={label}>{label}</span>)}</div>
    </section>
    <section className="ticker"><span>SELF-PACED COURSES</span><i/> <span>LIVE ONLINE CLASSES</span><i/> <span>REAL PROJECTS</span><i/> <span>VERIFIED COMPLETION</span><i/> <span>WAVE OPPORTUNITIES</span></section>
    <section className="section featured"><div className="section-heading"><div><span className="eyebrow dark">Start learning</span><h2>Begin with something useful.</h2></div><button className="text-link" onClick={() => go("catalog")}>View every course →</button></div><div className="course-grid">{courses.slice(0, 3).map((course) => <CourseCard key={course.id} course={course} enrolled={false} onClick={() => go("catalog")} />)}</div></section>
    <section className="pathway"><div className="section-heading inverse"><div><span className="eyebrow">The Learn pathway</span><h2>Progress has a clear next step.</h2></div><p>Learning is valuable when it changes what you can make, improve or lead.</p></div><div className="pathway-grid">{pathways.map(([number,title,copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="challenge-callout"><div><span className="eyebrow dark">Free signature program</span><h2>Build a business in four weeks.</h2><p>Move from a real customer problem to a tested offer, evidence and a concise pitch. Completing the challenge creates a fair pathway to apply for the BrownGlobal Venture Challenge on Wave.</p></div><button className="button" onClick={() => go("challenge")}>See the Build Challenge <span>→</span></button></section>
  </main>;
}

function CourseCard({ course, enrolled, onClick }: { course: Course; enrolled: boolean; onClick: () => void }) {
  return <article className="course-card" style={{ "--course-color": course.color } as React.CSSProperties}><div className="course-top"><span>{course.school}</span><b>{course.access === "plus" ? "PLUS" : "FREE"}</b></div><div className="course-symbol"><i/><i/><i/></div><h3>{course.title}</h3><p>{course.description}</p><footer><span>{course.level} · {course.duration} · {course.lessons} lessons</span><button onClick={onClick}>{enrolled ? "Open" : "Enroll"} →</button></footer></article>;
}

function Catalog({ courses, enrolledIds, hasPlus, enroll }: { courses: Course[]; enrolledIds: string[]; hasPlus: boolean; enroll: (course: Course) => void }) {
  const [filter, setFilter] = useState("All");
  const schools = ["All", ...new Set(courses.map((course) => course.school))];
  const visible = filter === "All" ? courses : courses.filter((course) => course.school === filter);
  return <main className="page"><header className="page-hero mint"><span className="eyebrow dark">Course catalog</span><h1>Choose what you want to build next.</h1><p>Enroll immediately. No application is required for open courses.</p></header><section className="section catalog"><div className="filters">{schools.map((school) => <button key={school} className={filter === school ? "active" : ""} onClick={() => setFilter(school)}>{school}</button>)}</div><div className="course-grid">{visible.map((course) => <CourseCard key={course.id} course={course} enrolled={enrolledIds.includes(course.id)} onClick={() => enroll(course)} />)}</div>{!hasPlus && <div className="inline-promo"><strong>Learn Plus unlocks every course and interactive class.</strong><span>It is also included with an active BrownGlobal Business membership.</span></div>}</section></main>;
}

function Live({ sessions, registeredIds, register }: { sessions: LiveSession[]; registeredIds: string[]; register: (item: LiveSession) => void }) {
  return <main className="page"><header className="page-hero dark"><span className="eyebrow">Live online learning</span><h1>Ask questions. Practice together.</h1><p>Public classes are free. Interactive labs and office hours are included with Learn Plus and BrownGlobal Business.</p></header><section className="section live-list">{sessions.map((item) => <article key={item.id}><div className="date-block"><strong>{new Date(item.startsAt).getDate()}</strong><span>{new Date(item.startsAt).toLocaleString(undefined,{month:"short"})}</span></div><div className="live-detail"><div><span className="access-tag">{item.access === "free" ? "FREE LIVE" : "PLUS LIVE"}</span><span>{item.kind} · {item.language}</span></div><h2>{item.title}</h2><p>{formatDate(item.startsAt)} · {item.durationMinutes} minutes · {item.instructor}</p></div><button className={`button ${registeredIds.includes(item.id) ? "registered" : ""}`} onClick={() => register(item)}>{registeredIds.includes(item.id) ? "Registered ✓" : "Reserve online place"}</button></article>)}</section></main>;
}

function Challenge({ session, challengeId, submissionId, requireAccount, tell, onSubmitted, go }: { session: Session | null; challengeId: string | null; submissionId: string | null; requireAccount: () => boolean; tell: (tone: NoticeTone, text: string) => void; onSubmitted: (id: string) => void; go: (view: View) => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!requireAccount()) return;
    if (!supabase || !session || !challengeId) return tell("info", "Challenge submissions will activate when the shared BrownGlobal backend is connected.");
    const form = new FormData(event.currentTarget); setBusy(true);
    const payload = { user_id: session.user.id, challenge_id: challengeId, project_name: form.get("project_name"), problem: form.get("problem"), customer: form.get("customer"), offer: form.get("offer"), evidence_url: form.get("evidence_url") || null, pitch_url: form.get("pitch_url") || null, status: "submitted", submitted_at: new Date().toISOString() };
    const { data, error } = await supabase.from("learning_challenge_submissions").upsert(payload, { onConflict: "user_id,challenge_id" }).select("id").single(); setBusy(false);
    if (error) return tell("error", error.message); onSubmitted(data.id); tell("success", "Your Build Challenge project has been submitted.");
  };
  return <main className="page"><header className="page-hero lime"><span className="eyebrow dark">Free four-week challenge</span><h1>Build a business—not just a pitch.</h1><p>Everyone can participate. Payment never affects eligibility for the Wave series.</p></header><section className="section challenge-layout"><div className="challenge-weeks">{[["Week 1","Find the opportunity","Choose a real problem, identify the customer and gather direct evidence."],["Week 2","Build the offer","Define the solution, price and simple way the business can earn revenue."],["Week 3","Test it","Create a prototype or sample, show it to customers and record what happens."],["Week 4","Present it","Improve the business and submit evidence plus a concise two-minute pitch."]].map((week,index)=><article key={week[0]}><span>0{index+1}</span><div><small>{week[0]}</small><h2>{week[1]}</h2><p>{week[2]}</p></div></article>)}</div><aside className="submission-card"><span className="eyebrow dark">Your project</span><h2>{submissionId ? "Project submitted" : "Submit your Build project"}</h2>{submissionId ? <><p>Your work is recorded. You may now apply separately for the Venture Challenge.</p><button className="button" onClick={() => go("series")}>Continue to series application →</button></> : <form onSubmit={submit}><label>Business or project name<input name="project_name" required maxLength={100}/></label><label>Problem you are solving<textarea name="problem" required maxLength={1200}/></label><label>Who needs it?<textarea name="customer" required maxLength={800}/></label><label>Your offer<textarea name="offer" required maxLength={1200}/></label><label>Evidence link <small>optional</small><input name="evidence_url" type="url" placeholder="https://"/></label><label>Two-minute pitch link <small>optional</small><input name="pitch_url" type="url" placeholder="https://"/></label><button className="button" disabled={busy}>{busy ? "Submitting…" : "Submit project"}</button></form>}</aside></section></main>;
}

function Series({ session, submissionId, requireAccount, tell, go }: { session: Session | null; submissionId: string | null; requireAccount: () => boolean; tell: (tone: NoticeTone, text: string) => void; go: (view: View) => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!requireAccount()) return;
    if (!submissionId) { go("challenge"); return tell("info", "Complete the free Build Challenge before applying for this season."); }
    if (!supabase || !session) return tell("info", "Series applications will activate when the shared BrownGlobal backend is connected.");
    const form = new FormData(event.currentTarget); setBusy(true);
    const { error } = await supabase.from("venture_applications").upsert({ user_id: session.user.id, challenge_submission_id: submissionId, season: "season-01", founder_story: form.get("founder_story"), progress_summary: form.get("progress_summary"), availability_confirmed: form.get("availability") === "yes", status: "submitted", submitted_at: new Date().toISOString() }, { onConflict: "user_id,season" }); setBusy(false);
    if (error) return tell("error", error.message); tell("success", "Your Venture Challenge application has been submitted for review.");
  };
  return <main className="page"><header className="series-hero"><div><span className="wave-badge">A WAVE ORIGINAL</span><h1>The BrownGlobal<br/>Venture Challenge</h1><p>Early businesses enter. Stronger, tested and more scalable businesses emerge.</p></div><div className="series-art"><strong>8</strong><span>ONLINE<br/>CHALLENGES</span></div></header><section className="section series-grid"><div><span className="eyebrow dark">What finalists do</span><h2>Build under real pressure—with real support.</h2><div className="episode-grid">{["Business audit","Customer proof","Product improvement","Brand system","Sales test","Operations","Growth campaign","Final pitch"].map((episode,index)=><article key={episode}><span>{String(index+1).padStart(2,"0")}</span><b>{episode}</b></article>)}</div><div className="fairness"><strong>Merit—not payment.</strong><p>Applying is free. Learn Plus does not improve selection odds. Judges assess evidence, execution, progress, originality and founder potential.</p></div></div><aside className="application-card"><span className="eyebrow dark">Season 01 application</span><h2>{submissionId ? "Apply with your project" : "Complete Build first"}</h2>{submissionId ? <form onSubmit={submit}><label>Your founder story<textarea name="founder_story" required maxLength={1600}/></label><label>What changed during Build?<textarea name="progress_summary" required maxLength={1600}/></label><label className="checkbox"><input type="checkbox" name="availability" value="yes" required/><span>I can participate remotely in scheduled online challenges and filming.</span></label><button className="button" disabled={busy}>{busy ? "Submitting…" : "Submit free application"}</button></form> : <><p>The series is for businesses with a tested foundation. Finish the free challenge, submit your project, then return here.</p><button className="button" onClick={() => go("challenge")}>Start Build Challenge →</button></>}</aside></section></main>;
}

function Dashboard({ session, enrolledCourses, sessions, hasPlus, plusSource, go, onAuth }: { session: Session | null; enrolledCourses: Course[]; sessions: LiveSession[]; hasPlus: boolean; plusSource: "business" | "plus" | null; go: (view: View) => void; onAuth: () => void }) {
  if (!session) return <main className="page"><section className="empty-state"><img src="/learn-logo.svg" alt=""/><h1>Your learning lives here.</h1><p>Sign in to see enrollments, live reservations and projects.</p><button className="button" onClick={onAuth}>Sign in</button></section></main>;
  return <main className="page dashboard"><header className="dashboard-head"><div><span className="eyebrow dark">My learning</span><h1>Welcome back.</h1><p>{session.user.email}</p></div><div className="membership"><small>ACCESS</small><strong>{hasPlus ? "Learn Plus" : "Learn Free"}</strong><span>{plusSource === "business" ? "Included with BrownGlobal Business" : plusSource === "plus" ? "Individual membership" : "Upgrade whenever you need more"}</span></div></header><section className="dashboard-grid"><div className="dashboard-panel"><div className="panel-title"><h2>My courses</h2><button onClick={() => go("catalog")}>Browse →</button></div>{enrolledCourses.length ? enrolledCourses.map((course)=><article className="enrollment" key={course.id}><i style={{background:course.color}}/><div><b>{course.title}</b><span>Ready to continue</span></div><button>Open</button></article>) : <div className="panel-empty"><p>You have not enrolled in a course yet.</p><button className="text-link" onClick={() => go("catalog")}>Find a course</button></div>}</div><div className="dashboard-panel"><div className="panel-title"><h2>Upcoming live</h2><button onClick={() => go("live")}>View all →</button></div>{sessions.length ? sessions.map((item)=><article className="enrollment" key={item.id}><i/><div><b>{item.title}</b><span>{formatDate(item.startsAt)}</span></div><button>Details</button></article>) : <div className="panel-empty"><p>No live classes reserved.</p><button className="text-link" onClick={() => go("live")}>See the schedule</button></div>}</div></section></main>;
}

function Pricing({ session, go, onAuth, tell }: { session: Session | null; go: (view: View) => void; onAuth: () => void; tell: (tone: NoticeTone, text: string) => void }) {
  return <main className="page"><header className="page-hero mint"><span className="eyebrow dark">Simple access</span><h1>Start free. Go deeper when it matters.</h1><p>No application is required to join Learn or enroll in open courses.</p></header><section className="section pricing-grid"><article><span className="plan-label">LEARN FREE</span><h2>$0</h2><p>For anyone ready to begin.</p><ul><li>Selected complete courses</li><li>Public live online classes</li><li>Basic projects and progress</li><li>Free Build Challenge</li><li>Eligibility to apply for the Wave series</li></ul><button className="button secondary" onClick={() => session ? go("catalog") : onAuth()}>{session ? "Browse free courses" : "Create free account"}</button></article><article className="featured-plan"><span className="plan-label">LEARN PLUS</span><h2>$4.99 <small>/ month</small></h2><p>Or $49.99 annually, with regional pricing.</p><ul><li>Complete course catalog</li><li>Interactive live classes and replays</li><li>Assignments and instructor feedback</li><li>Verified completion certificates</li><li>Portfolio and advanced learning records</li></ul><button className="button light" onClick={() => tell("info", "Learn Plus checkout will open when BrownGlobal billing is activated.")}>Choose Learn Plus</button></article><article><span className="plan-label">BROWNGLOBAL BUSINESS</span><h2>Included</h2><p>Learn Plus is included while an eligible Business membership is active.</p><ul><li>Learn Plus access for included members</li><li>Shared BrownGlobal workspace</li><li>Studio, Reach and Wave benefits</li><li>Central billing and member management</li><li>Business learning pathways</li></ul><a className="button secondary" href="mailto:admin@brownglobal.app?subject=BrownGlobal%20Business">Ask about Business</a></article></section></main>;
}

function AuthDialog({ mode, setMode, close, tell }: { mode: AuthMode; setMode: (mode: AuthMode) => void; close: () => void; tell: (tone: NoticeTone, text: string) => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return tell("info", "The shared BrownGlobal account connection is being prepared.");
    const form = new FormData(event.currentTarget); const email = String(form.get("email")); const password = String(form.get("password")); setBusy(true);
    const result = mode === "signup" ? await supabase.auth.signUp({ email, password, options: { data: { full_name: String(form.get("name") || "") } } }) : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false); if (result.error) return tell("error", result.error.message);
    close(); tell("success", mode === "signup" && !result.data.session ? "Check your email to confirm your BrownGlobal account." : "You are signed in.");
  };
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="close" onClick={close} aria-label="Close">×</button><img src="/learn-logo.svg" alt=""/><span className="eyebrow dark">BrownGlobal account</span><h2 id="auth-title">{mode === "signup" ? "Join Learn free" : "Welcome back"}</h2><p>{mode === "signup" ? "Enroll in courses, reserve live classes and save your work." : "Use the same account across eligible BrownGlobal platforms."}</p><form onSubmit={submit}>{mode === "signup" && <label>Full name<input name="name" autoComplete="name" required/></label>}<label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required/></label><button className="button" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create free account" : "Sign in"}</button></form><button className="switch-auth" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Already have an account? Sign in" : "New to BrownGlobal? Create an account"}</button></div></div>;
}

function Footer({ go }: { go: (view: View) => void }) {
  return <footer className="footer"><div className="brand footer-brand"><img src="/learn-logo.svg" alt=""/><span><strong>learn</strong><small>by BrownGlobal</small></span></div><p>Practical online education for skills, careers and businesses.</p><div>{views.slice(0,4).map((item)=><button key={item.key} onClick={() => go(item.key)}>{item.label}</button>)}</div><aside><a href="mailto:admin@brownglobal.app">admin@brownglobal.app</a><span>© 2026 BrownGlobal Holdings LLC</span></aside></footer>;
}

