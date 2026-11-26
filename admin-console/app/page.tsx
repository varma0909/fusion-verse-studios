"use client";

import { FormEvent, useEffect, useState } from "react";
import { BarChart3, FolderKanban, Image, Inbox, LogOut, Settings, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CONTACT_EMAIL, LEGACY_CONTACT_EMAIL } from "@/lib/constants";

type Section = "Overview" | "Projects" | "Brands" | "Team" | "Inquiries" | "Settings";

const websiteUrl =
  process.env.NEXT_PUBLIC_WEBSITE_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("Overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ projects: 0, drafts: 0, brands: 0, team: 0, inquiries: 0 });

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    async function checkSession() {
      const { data, error: sessionError } = await supabase!.auth.getSession();
      if (!active) return;
      if (sessionError) {
        setError(`Could not check your admin session: ${sessionError.message}`);
        setLoading(false);
        return;
      }

      if (data.session) {
        const { data: isAdmin, error: accessError } = await supabase!.rpc("is_admin");
        if (!active) return;
        if (accessError) {
          setError(`Could not verify admin access: ${accessError.message}`);
          await supabase!.auth.signOut();
        } else if (isAdmin) {
          setAuthenticated(true);
        } else {
          setError("This account is not authorized to access the admin console.");
          await supabase!.auth.signOut();
        }
      }
      if (active) setLoading(false);
    }

    void checkSession();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setAuthenticated(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authenticated || !supabase) return;
    async function loadCounts() {
      const [published, drafts, brands, team, inquiries] = await Promise.all([
        supabase!.from("projects").select("id", { count: "exact", head: true }).eq("published", true),
        supabase!.from("projects").select("id", { count: "exact", head: true }).eq("published", false),
        supabase!.from("brands").select("id", { count: "exact", head: true }),
        supabase!.from("team_members").select("id", { count: "exact", head: true }),
        supabase!.from("inquiries").select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      setCounts({
        projects: published.count || 0,
        drafts: drafts.count || 0,
        brands: brands.count || 0,
        team: team.count || 0,
        inquiries: inquiries.count || 0,
      });
    }
    loadCounts();
  }, [authenticated]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!supabase) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    else {
      const { data: isAdmin, error: accessError } = await supabase.rpc("is_admin");
      if (accessError) {
        await supabase.auth.signOut();
        setError(`Could not verify admin access: ${accessError.message}`);
      } else if (!isAdmin) {
        await supabase.auth.signOut();
        setError("This account is not authorized to access the admin console.");
      } else {
        setAuthenticated(true);
      }
    }
  }

  async function logout() {
    await supabase?.auth.signOut();
    setAuthenticated(false);
  }

  if (loading) return <main className="admin-loading">Loading studio controls...</main>;

  if (!authenticated) {
    return (
      <main className="admin-login">
        <form onSubmit={login}>
          <div className="admin-logo">FVS</div>
          <small>SECURE ADMINISTRATION</small>
          <h1>Studio Control</h1>
          <p>Sign in to manage published content.</p>
          <label>Email Address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="admin-error">{error}</div>}
          <button type="submit">Enter Dashboard</button>
          {websiteUrl && <a href={websiteUrl}>← Return to website</a>}
        </form>
      </main>
    );
  }

  const menu: { name: Section; icon: typeof BarChart3 }[] = [
    { name: "Overview", icon: BarChart3 },
    { name: "Projects", icon: FolderKanban },
    { name: "Brands", icon: Image },
    { name: "Team", icon: Users },
    { name: "Inquiries", icon: Inbox },
    { name: "Settings", icon: Settings },
  ];

  return (
    <main className="admin-shell">
      <aside>
        <div className="admin-logo">FVS</div>
        <small>STUDIO CONTROL</small>
        <nav>
          {menu.map(({ name, icon: Icon }) => (
            <button className={section === name ? "active" : ""} onClick={() => setSection(name)} key={name}>
              <Icon size={18} /> {name}
              {name === "Inquiries" && counts.inquiries > 0 && <b>{counts.inquiries}</b>}
            </button>
          ))}
        </nav>
        <button className="logout" onClick={logout}><LogOut size={18} /> Sign out</button>
      </aside>
      <section className="admin-content">
        <header>
          <div><small>FUSION VERSE STUDIOS</small><h1>{section}</h1></div>
          {websiteUrl && <a href={websiteUrl} target="_blank" rel="noreferrer">View website ↗</a>}
        </header>

        {section === "Overview" && (
          <div className="dashboard">
            <div className="metric-grid">
              <article><small>Published Projects</small><strong>{counts.projects}</strong><span>Live on website</span></article>
              <article><small>Draft Projects</small><strong>{counts.drafts}</strong><span>Awaiting publication</span></article>
              <article><small>Brands</small><strong>{counts.brands}</strong><span>Collaborations</span></article>
              <article><small>Team Members</small><strong>{counts.team}</strong><span>Studio profiles</span></article>
            </div>
            <div className="dashboard-panels">
              <article><div><small>Recent Inquiries</small><b>{counts.inquiries} unread</b></div><p>Open the inquiry manager to review and respond to new project requests.</p><button onClick={() => setSection("Inquiries")}>Open inbox</button></article>
              <article><div><small>Content Status</small><b>Production ready</b></div><p>Your public website is connected to the Supabase content database.</p><button onClick={() => setSection("Projects")}>Manage projects</button></article>
            </div>
          </div>
        )}

        {section !== "Overview" && (
          <div className="admin-workarea">
            <div>
              <h2>{section === "Projects" ? "Portfolio Management" : section === "Brands" ? "Brands & Collaborations" : section === "Team" ? "Team Profiles" : section === "Inquiries" ? "Contact Inquiries" : "Website Settings"}</h2>
              <p>{section === "Settings" ? "Configure public content and administrator preferences." : `Add, edit, and organize ${section.toLowerCase()} from this workspace.`}</p>
            </div>
            {section === "Projects" && <ProjectManager />}
            {section === "Brands" && <BrandManager />}
            {section === "Team" && <TeamManager />}
            {section === "Inquiries" && <InquiryManager />}
            {section === "Settings" && <SettingsManager />}
          </div>
        )}
      </section>
    </main>
  );
}

function ProjectManager() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    supabase?.from("projects").select("*").order("position").then(({ data }) => setItems(data || []));
  }, []);
  async function addProject() {
    if (!supabase) return;
    const title = window.prompt("Project title");
    if (!title) return;
    const category = window.prompt("Category (AI Films, Micro Dramas, Commercial Ads, AI VFX, Animation)") || "AI Films";
    await supabase.from("projects").insert({ title, category, slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}` });
    const { data } = await supabase.from("projects").select("*").order("position");
    setItems(data || []);
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this project?")) return;
    await supabase?.from("projects").delete().eq("id", id);
    setItems((current) => current.filter((item) => item.id !== id));
  }
  return <div className="manager"><button className="add-button" onClick={addProject}>+ Add Project</button>{items.length ? items.map((item) => <article key={String(item.id)}><div><small>{String(item.category)}</small><h3>{String(item.title)}</h3></div><span className={item.published ? "status live" : "status"}>{item.published ? "Published" : "Draft"}</span><button onClick={() => remove(String(item.id))}>Delete</button></article>) : <div className="empty-state">No projects yet. Create the first portfolio entry.</div>}</div>;
}

function BrandManager() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  useEffect(() => { supabase?.from("brands").select("*").order("position").then(({ data }) => setItems(data || [])); }, []);
  async function addBrand() {
    const name = window.prompt("Brand or partner name");
    if (name) {
      await supabase?.from("brands").insert({ name });
      const result = await supabase?.from("brands").select("*").order("position");
      setItems(result?.data || []);
    }
  }
  return <div className="manager"><button className="add-button" onClick={addBrand}>+ Add Brand</button>{items.length ? items.map((item) => <article key={String(item.id)}><div><small>Collaboration</small><h3>{String(item.name)}</h3></div><button onClick={async () => { await supabase?.from("brands").delete().eq("id", item.id); setItems((current) => current.filter((entry) => entry.id !== item.id)); }}>Delete</button></article>) : <div className="empty-state">No collaborations yet.</div>}</div>;
}

function TeamManager() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  useEffect(() => { supabase?.from("team_members").select("*").order("position").then(({ data }) => setItems(data || [])); }, []);
  async function addMember() {
    const name = window.prompt("Full name");
    if (!name) return;
    const role = window.prompt("Role / designation") || "Creative Team";
    await supabase?.from("team_members").insert({ name, role });
    const result = await supabase?.from("team_members").select("*").order("position");
    setItems(result?.data || []);
  }
  return <div className="manager"><button className="add-button" onClick={addMember}>+ Add Team Member</button>{items.length ? items.map((item) => <article key={String(item.id)}><div><small>{String(item.role)}</small><h3>{String(item.name)}</h3></div><button onClick={async () => { await supabase?.from("team_members").delete().eq("id", item.id); setItems((current) => current.filter((entry) => entry.id !== item.id)); }}>Remove</button></article>) : <div className="empty-state">No team profiles yet.</div>}</div>;
}

function InquiryManager() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  useEffect(() => { supabase?.from("inquiries").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || [])); }, []);
  return <div className="manager">{items.length ? items.map((item) => <article key={String(item.id)}><div><small>{String(item.email)}{item.phone ? ` · ${String(item.phone)}` : ""} · {item.project_type ? String(item.project_type) : "General inquiry"}</small><h3>{String(item.name)}</h3><p>{String(item.message)}</p></div><button onClick={async () => { await supabase?.from("inquiries").update({ is_read: true, status: "read" }).eq("id", item.id); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry)); }}>Mark read</button></article>) : <div className="empty-state">No inquiries received.</div>}</div>;
}

function SettingsManager() {
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [settings, setSettings] = useState({
    homepage_headline: "IMAGINATION.\nREIMAGINED\nTHROUGH AI.",
    about_text: "",
    contact_email: DEFAULT_CONTACT_EMAIL,
    linkedin_url: "",
    instagram_url: "",
    youtube_url: "",
  });

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setFeedback(`Could not load website settings: ${error.message}`);
          return;
        }
        if (data) {
          setSettings({
            homepage_headline: data.homepage_headline || "IMAGINATION.\nREIMAGINED\nTHROUGH AI.",
            about_text: data.about_text || "",
            contact_email:
              data.contact_email && data.contact_email !== LEGACY_CONTACT_EMAIL
                ? data.contact_email
                : DEFAULT_CONTACT_EMAIL,
            linkedin_url: data.linkedin_url || "",
            instagram_url: data.instagram_url || "",
            youtube_url: data.youtube_url || "",
          });
        }
      });
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setFeedback("Supabase is not configured. Website settings could not be saved.");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const { error } = await supabase.from("site_settings").upsert({
        id: 1,
        ...settings,
      });
      if (error) {
        setFeedback(`Could not save website settings: ${error.message}`);
      } else {
        setFeedback("Website settings saved.");
      }
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? `Could not save website settings: ${error.message}`
          : "Could not save website settings due to an unexpected error.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="settings-form" onSubmit={save}>
      <label>Homepage Headline<textarea name="headline" rows={3} value={settings.homepage_headline} onChange={(event) => setSettings({ ...settings, homepage_headline: event.target.value })} /></label>
      <label>About Section<textarea name="about" rows={5} value={settings.about_text} onChange={(event) => setSettings({ ...settings, about_text: event.target.value })} /></label>
      <label>Contact Email<input name="email" type="email" value={settings.contact_email} onChange={(event) => setSettings({ ...settings, contact_email: event.target.value })} /></label>
      <div className="form-row">
        <label>LinkedIn<input name="linkedin" value={settings.linkedin_url} onChange={(event) => setSettings({ ...settings, linkedin_url: event.target.value })} /></label>
        <label>Instagram<input name="instagram" value={settings.instagram_url} onChange={(event) => setSettings({ ...settings, instagram_url: event.target.value })} /></label>
      </div>
      <label>YouTube<input name="youtube" value={settings.youtube_url} onChange={(event) => setSettings({ ...settings, youtube_url: event.target.value })} /></label>
      {feedback && <p role="status">{feedback}</p>}
      <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button>
    </form>
  );
}
