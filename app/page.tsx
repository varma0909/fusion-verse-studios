
"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Film,
  Menu,
  Play,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { DEFAULT_CONTACT_EMAIL } from "@/lib/constants";
import type {
  Brand,
  Project,
  SiteSettings,
  TeamMember,
} from "@/lib/types";

const services = [
  ["01", "AI Films", "Cinematic films created through advanced AI production workflows and creative direction."],
  ["02", "AI Micro Dramas", "Short-form cinematic entertainment and episodic storytelling."],
  ["03", "Commercial Advertisements", "Visually engaging campaigns for brands, products, and businesses."],
  ["04", "AI Visual Effects", "Advanced environments, compositing, and cinematic enhancements."],
  ["05", "AI Animation", "Character movement and immersive, visually crafted sequences."],
  ["06", "Character & World Design", "Characters, costumes, visual references, and cinematic world-building."],
];

const projectImages = [
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=1400&q=85",
];

const categories = [
  "All",
  "AI Films",
  "Micro Dramas",
  "Commercial Ads",
  "AI VFX",
  "Animation",
];

const heroSlides = [
  {
    label: "MYTHOLOGY",
    video: "/fv-mythology.mp4",
    poster: "/fv-mythology-poster.jpg",
  },
  {
    label: "COMMERCIAL AD",
    video: "/fv-commercial-ad.mp4",
    poster: "/fv-commercial-ad-poster.jpg",
  },
  {
    label: "MICRO DRAMA",
    video: "/fv-micro-drama.mp4",
    poster: "/fv-micro-drama-poster.jpg",
  },
  {
    label: "AI VFX",
    video: "/fv-vfx.mp4",
    poster: "/fv-vfx-poster.jpg",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectError, setProjectError] = useState("");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [siteSettings, setSiteSettings] =
    useState<SiteSettings | null>(null);

  const [activeCategory, setActiveCategory] = useState("All");
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [heroSlide, setHeroSlide] = useState(0);

  // Fetch published projects from Supabase
  useEffect(() => {
    if (!supabase) {
      setProjectError("Unable to connect to the project database.");
      setProjectsLoading(false);
      return;
    }

    let mounted = true;

    const loadProjects = async () => {
      setProjectsLoading(true);
      setProjectError("");

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("published", true)
          .order("position", { ascending: true });

        if (error) {
          console.error("PROJECT FETCH ERROR:", error);
          if (mounted) {
            setProjectError(error.message);
            setProjects([]);
          }
          return;
        }

        console.log("FVS PUBLISHED PROJECTS:", data);

        if (mounted) {
          setProjects(data || []);
        }
      } catch (error) {
        console.error("PROJECT FETCH FAILED:", error);

        if (mounted) {
          setProjectError(
            "Unable to load projects. Please try again later."
          );
        }
      } finally {
        if (mounted) {
          setProjectsLoading(false);
        }
      }
    };

    // Initial fetch
    loadProjects();

    // Listen for project publishing and updating
    const channel = supabase
      .channel("public-projects-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        () => {
          console.log("Project database changed. Refreshing projects...");
          loadProjects();
        }
      )
      .subscribe((status) => {
        console.log("Project realtime subscription:", status);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch other website content
  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    async function loadWebsiteData() {
      const [brandResult, teamResult, settingsResult] =
        await Promise.all([
          supabase.from("brands").select("*").order("position"),
          supabase.from("team_members").select("*").order("position"),
          supabase
            .from("site_settings")
            .select("*")
            .eq("id", 1)
            .maybeSingle(),
        ]);

      if (!mounted) return;

      if (brandResult.error) {
        console.error("BRANDS FETCH ERROR:", brandResult.error);
      } else {
        setBrands(brandResult.data || []);
      }

      if (teamResult.error) {
        console.error("TEAM FETCH ERROR:", teamResult.error);
      } else {
        setTeam(teamResult.data || []);
      }

      if (settingsResult.error) {
        console.error("SETTINGS FETCH ERROR:", settingsResult.error);
      } else if (settingsResult.data) {
        setSiteSettings(settingsResult.data);
      }
    }

    loadWebsiteData();

    return () => {
      mounted = false;
    };
  }, []);

  // Navbar scroll detection
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    onScroll();

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Hero video rotation
  useEffect(() => {
    const currentSlide = heroSlides[heroSlide];

    if (!currentSlide) return;

    // Video handles its own next-slide transition.
    const timer = window.setTimeout(() => {
      setHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 30000);

    return () => window.clearTimeout(timer);
  }, [heroSlide]);

  // Contact inquiry submission
  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    setSubmissionError("");
    setSubmitted(false);

    if (!supabase) {
      setSubmissionError(
        `Inquiry submission is unavailable. Please email ${DEFAULT_CONTACT_EMAIL}.`
      );
      return;
    }

    try {
      const submissionToken = crypto.randomUUID();

      const { error } = await supabase.from("inquiries").insert({
        name: data.get("name"),
        email: data.get("email"),
        phone: String(data.get("phone") || "").trim() || null,
        company: data.get("company"),
        project_type: data.get("project_type"),
        message: data.get("message"),
        submission_token: submissionToken,
      });

      if (error) {
        setSubmissionError(
          `We couldn't submit your inquiry: ${error.message}`
        );
        return;
      }

      setSubmitted(true);
      form.reset();

      try {
        const { error: emailError } = await supabase.functions.invoke(
          "send-inquiry-emails",
          {
            body: {
              submission_token: submissionToken,
            },
          }
        );

        if (emailError) {
          setSubmissionError(
            "Your inquiry was saved, but email notifications could not be sent."
          );
        }
      } catch {
        setSubmissionError(
          "Your inquiry was saved, but email notifications could not be sent."
        );
      }
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? `We couldn't submit your inquiry: ${error.message}`
          : `Please email ${DEFAULT_CONTACT_EMAIL}.`
      );
    }
  }

  // Dynamic homepage content
  const headlineLines = (
    siteSettings?.homepage_headline ||
    "IMAGINATION.\nREIMAGINED\nTHROUGH AI."
  ).split(/\r?\n/);

  const visibleProjects =
    activeCategory === "All"
      ? projects
      : projects.filter(
          (project) => project.category === activeCategory
        );

  return (
    <main>
      {/* NAVIGATION */}
      <nav className={scrolled ? "nav nav-scrolled" : "nav"}>
        <a
          className="brand"
          href="#home"
          aria-label="Fusion Verse Studios home"
        >
          <img
            src="/fusion-verse-studios-logo-cropped.png"
            alt="Fusion Verse Studios"
          />
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <div className={menuOpen ? "nav-links nav-open" : "nav-links"}>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#works" onClick={() => setMenuOpen(false)}>Our Works</a>
          <a href="#team" onClick={() => setMenuOpen(false)}>Studio</a>
          <a
            className="nav-cta"
            href="#contact"
            onClick={() => setMenuOpen(false)}
          >
            Let's Collaborate <ArrowRight size={15} />
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="home">
        {heroSlides.map((slide, index) => (
          <div
            className={`hero-slide ${
              heroSlide === index ? "active" : ""
            }`}
            key={slide.label}
            style={{
              backgroundImage: `url("${slide.poster}")`,
            }}
          >
            {heroSlide === index && (
              <video
                muted
                autoPlay
                playsInline
                poster={slide.poster}
                preload="metadata"
                aria-label={`${slide.label} showreel`}
                onEnded={() =>
                  setHeroSlide(
                    (current) => (current + 1) % heroSlides.length
                  )
                }
                onError={() =>
                  setHeroSlide(
                    (current) => (current + 1) % heroSlides.length
                  )
                }
              >
                <source src={slide.video} type="video/mp4" />
              </video>
            )}
          </div>
        ))}

        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-grid" />

        <div className="hero-content reveal">
          <div className="eyebrow">
            <span /> AI-powered creative production studio
          </div>

          <h1>
            {headlineLines.map((line, index) => (
              <span key={`${line}-${index}`}>
                {index === 1 ? <em>{line}</em> : line}
                {index < headlineLines.length - 1 && <br />}
              </span>
            ))}
          </h1>

          <p>
            We transform bold ideas into cinematic experiences through
            AI-powered filmmaking, visual storytelling, and next-generation
            creative technology.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href="#works">
              Explore Our Works <ArrowRight size={17} />
            </a>
            <a className="button button-ghost" href="#contact">
              Start a Project
            </a>
          </div>
        </div>

        <a
          className="scroll-cue"
          href="#about"
          aria-label="Scroll to about"
        >
          <span>Discover</span>
          <ArrowDown size={16} />
        </a>

        <div className="hero-slider" aria-label="Hero showreel slides">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.label}
              className={heroSlide === index ? "active" : ""}
              onClick={() => setHeroSlide(index)}
              aria-label={`Play ${slide.label} slide`}
            >
              <span>0{index + 1}</span>
              <small>{slide.label}</small>
            </button>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="about section" id="about">
        <div className="section-index">01 / THE STUDIO</div>

        <div className="about-copy">
          <div className="eyebrow">
            <span /> Where creativity evolves
          </div>

          <h2>
            Where Imagination Meets <em>Intelligent Creation.</em>
          </h2>

          <p className="lead">
            {siteSettings?.about_text ||
              "Fusion Verse Studios is a next-generation creative production company combining artificial intelligence, cinematic storytelling, and innovative visual technologies to create compelling entertainment and commercial experiences. From AI-powered films and micro dramas to commercial advertisements and advanced visual effects, we transform concepts into visually extraordinary productions. Our approach brings together creative vision, emerging technology, and cinematic craftsmanship to redefine how stories are imagined, created, and experienced."}
          </p>

          <a className="text-link" href="#services">
            Discover our approach <ArrowRight size={16} />
          </a>
        </div>

        <div className="about-visual">
          <div className="about-image" />
          <div className="frame-label">
            <span>FVS</span>
            <small>STUDIO<br />FRAME_01</small>
          </div>
        </div>
      </section>

      {/* VISION */}
      <section className="vision-strip">
        <div>
          <small>Our vision</small>
          <p>
            To redefine the future of visual storytelling through
            creativity and intelligent technology.
          </p>
        </div>

        <div>
          <small>Our mission</small>
          <p>
            To create extraordinary cinematic and commercial experiences
            by combining human imagination with the possibilities of AI.
          </p>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services section" id="services">
        <div className="section-heading">
          <div>
            <div className="section-index">02 / CAPABILITIES</div>
            <h2>What We <em>Create</em></h2>
          </div>
          <p>
            Creative systems for stories, campaigns, characters, and worlds.
          </p>
        </div>

        <div className="service-list">
          {services.map(([number, title, description]) => (
            <article className="service-row" key={title}>
              <span className="service-number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <a href="#contact" aria-label={`Explore ${title}`}>
                <ArrowRight />
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* OUR WORKS */}
      <section className="works section" id="works">
        <div className="section-heading">
          <div>
            <div className="section-index">03 / SELECTED WORK</div>
            <h2>Our <em>Works</em></h2>
          </div>
        </div>

        {/* CATEGORY FILTERS */}
        <div className="filters">
          {categories.map((category) => (
            <button
              className={
                activeCategory === category ? "active" : ""
              }
              onClick={() => setActiveCategory(category)}
              key={category}
            >
              {category}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {projectsLoading && (
          <div className="project-loading" role="status">
            <p>Loading our latest projects...</p>
          </div>
        )}

        {/* DATABASE ERROR */}
        {!projectsLoading && projectError && (
          <div className="project-empty" role="alert">
            <h3>Unable to load projects</h3>
            <p>{projectError}</p>
            <button
              className="button button-primary"
              onClick={() => window.location.reload()}
            >
              Retry <ArrowRight size={17} />
            </button>
          </div>
        )}

        {/* PROJECTS */}
        {!projectsLoading &&
          !projectError &&
          visibleProjects.length > 0 && (
            <div className="project-grid">
              {visibleProjects.map((project) => (
                <article className="project-card" key={project.id}>
                  <div
                    className="project-image"
                    style={{
                      backgroundImage: `url("${
                        project.thumbnail_url || projectImages[0]
                      }")`,
                    }}
                  >
                    <span>
                      <Play fill="currentColor" size={18} />
                      View project
                    </span>
                  </div>

                  <div className="project-meta">
                    <small>
                      {project.category} · {project.year || ""}
                    </small>
                    <h3>{project.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          )}

        {/* NO PROJECTS */}
        {!projectsLoading &&
          !projectError &&
          visibleProjects.length === 0 && (
            <div className="project-empty">
              {projects.length === 0 ? (
                <>
                  <h3>Our next creation is on its way.</h3>
                  <p>
                    We are preparing something extraordinary.
                    Check back soon to explore our latest work.
                  </p>
                </>
              ) : (
                <>
                  <h3>No projects in this category yet.</h3>
                  <p>
                    Explore other categories to discover our work.
                  </p>
                  <button
                    className="button button-primary"
                    onClick={() => setActiveCategory("All")}
                  >
                    View All Projects <ArrowRight size={17} />
                  </button>
                </>
              )}
            </div>
          )}
      </section>

      {/* PARTNERS */}
      <section className="partners section" id="partners">
        <div className="partners-head">
          <div className="section-index">04 / COLLABORATIONS</div>
          <h2>
            Creative Partnerships.<br />
            <em>Limitless Possibilities.</em>
          </h2>
        </div>

        {brands.length > 0 ? (
          <div className="brand-grid">
            {brands.map((brand) => (
              <a
                href={brand.website_url || "#"}
                target="_blank"
                rel="noreferrer"
                key={brand.id}
              >
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} />
                ) : (
                  <strong>{brand.name}</strong>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="brand-grid">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item}>
                <span>PARTNER / 0{item}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TEAM */}
      <section className="team section" id="team">
        <div className="section-heading">
          <div>
            <div className="section-index">05 / OUR PEOPLE</div>
            <h2>
              Creative Minds <em>Behind the Vision</em>
            </h2>
          </div>
        </div>

        {team.length > 0 ? (
          <div className="team-grid">
            {team.map((member) => (
              <article className="team-card" key={member.id}>
                {member.portrait_url && (
                  <img src={member.portrait_url} alt={member.name} />
                )}
                <div>
                  <small>{member.role}</small>
                  <h3>{member.name}</h3>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="team-placeholder">
            <div className="silhouette">
              <Film />
            </div>
            <div>
              <small>THE STUDIO</small>
              <h3>Building our creative collective.</h3>
              <p>
                Team profiles are managed through the studio dashboard.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* CONTACT */}
      <section className="contact section" id="contact">
        <div className="contact-copy">
          <div className="section-index">07 / START A PROJECT</div>

          <h2>
            Have an Idea?<br />
            <em>Let's Create Something Extraordinary.</em>
          </h2>

          <p>
            Whether you're producing a film, creating a commercial,
            developing a micro drama, or exploring new creative
            possibilities, bring us your vision.
          </p>
        </div>

        <form className="contact-form" onSubmit={submitInquiry}>
          <div className="form-row">
            <label>
              Name
              <input name="name" required placeholder="Your name" />
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                required
                placeholder="you@company.com"
              />
            </label>
          </div>

          <label>
            Mobile Number
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Your mobile number (optional)"
            />
          </label>

          <div className="form-row">
            <label>
              Company / Brand
              <input name="company" placeholder="Company name" />
            </label>

            <label>
              Project Type
              <select name="project_type" defaultValue="">
                <option value="" disabled>Select a type</option>
                <option>AI Film</option>
                <option>Micro Drama</option>
                <option>Commercial</option>
                <option>AI VFX</option>
                <option>Animation</option>
                <option>Other</option>
              </select>
            </label>
          </div>

          <label>
            Project Description
            <textarea
              name="message"
              required
              rows={4}
              placeholder="Tell us about your vision..."
            />
          </label>

          {submissionError && (
            <p className="form-message form-error" role="alert">
              {submissionError}
            </p>
          )}

          {submitted && (
            <p className="form-message form-success" role="status">
              Thanks for submitting your inquiry. We will get back to you soon.
            </p>
          )}

          <button className="button button-primary" type="submit">
            {submitted ? "Inquiry Sent" : "Submit Inquiry"}
            <ArrowRight size={17} />
          </button>
        </form>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">
          <a className="brand" href="#home">
            <img
              src="/fusion-verse-studios-logo-cropped.png"
              alt="Fusion Verse Studios"
            />
          </a>

          <p>
            {siteSettings?.footer_description ||
              "AI-powered filmmaking and creative technology for stories that move beyond imagination."}
          </p>
        </div>

        <div className="footer-links">
          <small>Explore</small>
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#works">Our Works</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="footer-links">
          <small>Connect</small>
          {siteSettings?.linkedin_url && (
            <a href={siteSettings.linkedin_url} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          )}
          {siteSettings?.instagram_url && (
            <a href={siteSettings.instagram_url} target="_blank" rel="noreferrer">
              Instagram
            </a>
          )}
          {siteSettings?.youtube_url && (
            <a href={siteSettings.youtube_url} target="_blank" rel="noreferrer">
              YouTube
            </a>
          )}
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Fusion Verse Studios
          </span>
          <span>
            Imagining Beyond Boundaries. Creating Beyond Limits.
          </span>
        </div>
      </footer>
    </main>
  );
}
