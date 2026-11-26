export type Project = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  cover_url: string | null;
  video_url: string | null;
  description: string | null;
  category: string;
  brand_name: string | null;
  year: number | null;
  credits: string | null;
  featured: boolean;
  published: boolean;
  position: number;
};

export type Brand = {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  featured: boolean;
  position: number;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  portrait_url: string | null;
  biography: string | null;
  skills: string[] | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  position: number;
};

export type SiteSettings = {
  homepage_headline: string | null;
  about_text: string | null;
  vision: string | null;
  mission: string | null;
  contact_email: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  footer_description: string | null;
};
