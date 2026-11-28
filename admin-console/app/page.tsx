          const isRead = item.is_read === true;

          return (
            <article key={String(item.id)} className="inquiry-list-item">
              <div>
                <small>
                  {String(item.email || "No email")}
                  {item.phone ? ` · ${String(item.phone)}` : ""}
                  {" · "}
                  {item.project_type
                    ? String(item.project_type)
                    : "General inquiry"}
                  {item.created_at
                    ? ` · ${new Date(String(item.created_at)).toLocaleString()}`
                    : ""}
                </small>
                <h3>{String(item.name || "Unnamed visitor")}</h3>
                <p>{String(item.message || "")}</p>
                <small>{isRead ? "Read" : "Unread"}</small>
              </div>

              <button
                type="button"
                disabled={isRead || updatingId === String(item.id)}
                onClick={() => void markAsRead(String(item.id))}
              >
                {updatingId === String(item.id)
                  ? "Updating..."
                  : isRead
                    ? "Read"
                    : "Mark read"}
              </button>
            </article>
          );
        })
      ) : (
        <div className="empty-state">No inquiries received.</div>
      )}
    </div>
  );
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
