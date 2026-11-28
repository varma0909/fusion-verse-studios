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

  async function refreshUnreadInquiryCount() {
    if (!supabase) return;

    const { count, error: countError } = await supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);

    if (countError) {
      console.error("Could not refresh unread inquiry count:", countError.message);
      return;
    }

    setCounts((current) => ({ ...current, inquiries: count || 0 }));
  }

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
