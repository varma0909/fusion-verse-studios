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
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("AI Films");
  const [description, setDescription] = useState("");
  const [brandName, setBrandName] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [credits, setCredits] = useState("");
  const [featured, setFeatured] = useState(false);

  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);

  async function loadProjects() {
    if (!supabase) {
      setFeedback("Supabase is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      setFeedback(`Could not load projects: ${error.message}`);
    } else {
      setItems(data || []);
      setFeedback("");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  function resetForm() {
    setTitle("");
    setCategory("AI Films");
    setDescription("");
    setBrandName("");
    setYear(String(new Date().getFullYear()));
    setCredits("");
    setFeatured(false);
    setThumbnail(null);
    setCover(null);
    setVideo(null);
  }

  async function uploadFile(file: File, folder: string) {
    if (!supabase) throw new Error("Supabase is not configured.");

    const extension = file.name.split(".").pop()?.toLowerCase() || "file";
    const path = `projects/${folder}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      throw new Error(`Upload failed for ${file.name}: ${error.message}`);
    }

    const { data } = supabase.storage.from("media").getPublicUrl(path);

    return data.publicUrl;
  }

  async function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || saving) return;

    if (!title.trim() || !category || !video) {
      setFeedback("Please enter a title, select a category and upload a video.");
      return;
    }

    if (thumbnail && !thumbnail.type.startsWith("image/")) {
      setFeedback("Thumbnail must be an image.");
      return;
    }

    if (cover && !cover.type.startsWith("image/")) {
      setFeedback("Cover must be an image.");
      return;
    }

    if (!video.type.startsWith("video/")) {
      setFeedback("Please select a valid video file.");
      return;
    }

    setSaving(true);
    setFeedback("");

    try {
      const slug =
        `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

      // Upload selected media to Supabase Storage.
      const [thumbnailUrl, coverUrl, videoUrl] = await Promise.all([
        thumbnail ? uploadFile(thumbnail, slug) : Promise.resolve(null),
        cover ? uploadFile(cover, slug) : Promise.resolve(null),
        uploadFile(video, slug),
      ]);

      // Save project information in Supabase.
      const { data, error } = await supabase
        .from("projects")
        .insert({
          title: title.trim(),
          slug,
          category,
          description: description.trim(),
          brand_name: brandName.trim() || null,
          year: year ? Number(year) : null,
          credits: credits.trim() || null,
          thumbnail_url: thumbnailUrl,
          cover_url: coverUrl,
          video_url: videoUrl,
          featured,
          published: false,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setItems((current) => [...current, data]);
      resetForm();
      setCreating(false);
      setFeedback("Project created successfully and saved as a draft.");

    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unexpected error while creating project."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      setFeedback(`Could not delete project: ${error.message}`);
      setDeletingId(null);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    setDeletingId(null);
    setFeedback("Project deleted successfully.");
  }

  // Full-page project creation workspace.
  if (creating) {
    return (
      <div className="project-editor">

        <div className="project-editor-header">
          <div>
            <small>PORTFOLIO / NEW PROJECT</small>
            <h2>Create New Project</h2>
            <p>Add your project details and upload the production media.</p>
          </div>

          <button
            type="button"
            className="project-back-button"
            onClick={() => {
              setCreating(false);
              setFeedback("");
            }}
            disabled={saving}
          >
            ← Back to Projects
          </button>
        </div>

        <form onSubmit={addProject}>

          <div className="project-form-section">
            <h3>01. Project Information</h3>

            <label>
              Project Title *
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter project title"
                required
              />
            </label>

            <label>
              Category *
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option>AI Films</option>
                <option>Micro Dramas</option>
                <option>Commercial Ads</option>
                <option>AI VFX</option>
                <option>Animation</option>
              </select>
            </label>

            <label>
              Project Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={5}
              />
            </label>

            <div className="project-form-row">
              <label>
                Brand / Client
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Brand or client name"
                />
              </label>

              <label>
                Production Year
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </label>
            </div>

            <label>
              Credits
              <input
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                placeholder="Director, Creative Team, etc."
              />
            </label>

            <label className="project-featured-toggle">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              Feature this project on the website
            </label>
          </div>

          <div className="project-form-section">
            <h3>02. Project Images</h3>
            <p>Upload images to represent your project on the portfolio.</p>

            <div className="project-upload-grid">

              <label className="project-upload-box">
                <span className="upload-icon">▧</span>
                <strong>Thumbnail Image</strong>
                <small>JPG, PNG or WebP</small>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setThumbnail(e.target.files?.[0] || null)
                  }
                />
                <span className="selected-file">
                  {thumbnail?.name || "Choose thumbnail"}
                </span>
              </label>

              <label className="project-upload-box">
                <span className="upload-icon">▧</span>
                <strong>Cover Image</strong>
                <small>JPG, PNG or WebP</small>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setCover(e.target.files?.[0] || null)
                  }
                />
                <span className="selected-file">
                  {cover?.name || "Choose cover image"}
                </span>
              </label>

            </div>
          </div>

          <div className="project-form-section">
            <h3>03. Project Video</h3>
            <p>Upload the final video that will appear in your portfolio.</p>

            <label className="project-video-upload">
              <span className="upload-icon">▶</span>
              <strong>Upload Project Video *</strong>
              <small>MP4, MOV or WebM</small>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                onChange={(e) =>
                  setVideo(e.target.files?.[0] || null)
                }
                required
              />
              <span className="selected-file">
                {video?.name || "Select video from your computer"}
              </span>
              {video && (
                <small>
                  {(video.size / (1024 * 1024)).toFixed(2)} MB
                </small>
              )}
            </label>
          </div>

          {feedback && (
            <p className="project-feedback" role="status">
              {feedback}
            </p>
          )}

          <div className="project-form-actions">
            <button
              type="button"
              className="project-back-button"
              onClick={() => {
                setCreating(false);
                setFeedback("");
              }}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="add-button"
              disabled={saving}
            >
              {saving ? "Uploading & Creating..." : "Create Project as Draft"}
            </button>
          </div>

        </form>
      </div>
    );
  }

  // Existing projects listing.
  return (
    <div className="manager">

      <div className="project-list-header">
        <div>
          <h3>Your Portfolio Projects</h3>
          <p>Manage your studio's published and draft projects.</p>
        </div>

        <button
          className="add-button"
          onClick={() => {
            resetForm();
            setFeedback("");
            setCreating(true);
          }}
        >
          + Create New Project
        </button>
      </div>

      {feedback && (
        <p role="status" className="project-feedback">
          {feedback}
        </p>
      )}

      {loading ? (
        <p>Loading projects...</p>
      ) : items.length ? (
        items.map((item) => (
          <article key={String(item.id)} className="project-list-item">

            {item.thumbnail_url && (
              <img
                src={String(item.thumbnail_url)}
                alt={String(item.title)}
                className="project-list-thumbnail"
              />
            )}

            <div className="project-list-details">
              <small>{String(item.category || "Uncategorized")}</small>
              <h3>{String(item.title)}</h3>
              <span className={item.published ? "status live" : "status"}>
                {item.published ? "Published" : "Draft"}
              </span>
            </div>

            {deletingId === String(item.id) ? (
              <div className="project-delete-confirm">
                <span>Delete this project?</span>
                <button
                  type="button"
                  onClick={() => remove(String(item.id))}
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeletingId(String(item.id))}
              >
                Delete
              </button>
            )}

          </article>
        ))
      ) : (
        <div className="empty-state">
          No projects yet. Create your first portfolio entry.
        </div>
      )}
    </div>
  );
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
