"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase";

export type ProfileBrandingNav = {
  brandName: string;
  brandLogoUrl: string;
  whiteLabelMode: boolean;
  loaded: boolean;
};

export function useProfileBrandingNav(): ProfileBrandingNav {
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [whiteLabelMode, setWhiteLabelMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setBrandName("");
        setBrandLogoUrl("");
        setWhiteLabelMode(false);
        setLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("brand_name, brand_logo_url, white_label_mode")
        .eq("id", user.id)
        .maybeSingle();
      setBrandName(typeof data?.brand_name === "string" ? data.brand_name.trim() : "");
      setBrandLogoUrl(
        typeof data?.brand_logo_url === "string" ? data.brand_logo_url.trim() : "",
      );
      setWhiteLabelMode(
        (data as { white_label_mode?: boolean } | null)?.white_label_mode === true,
      );
      setLoaded(true);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    const onProfileReload = () => {
      void load();
    };
    window.addEventListener("handover:profile-reload", onProfileReload);

    return () => {
      window.removeEventListener("handover:profile-reload", onProfileReload);
      subscription.unsubscribe();
    };
  }, []);

  return { brandName, brandLogoUrl, whiteLabelMode, loaded };
}
