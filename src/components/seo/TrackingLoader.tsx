'use client';

import React, { useEffect, useState } from 'react';
import { FacebookPixel } from './FacebookPixel';
import { GoogleAnalytics } from './GoogleAnalytics';
import { GoogleTagManager } from './GoogleTagManager';
import { CustomScripts } from './CustomScripts';
import { ClarityScript } from './ClarityScript';

type Setting = { key: string; value: string };

export default function TrackingLoader() {
  const [settings, setSettings] = useState<Setting[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/tracking-settings');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setSettings(json.settings || []);
      } catch (e) {
        // ignore
        console.warn('TrackingLoader fetch failed', e);
      }
    }
    load();
    return () => { mounted = false };
  }, []);

  const get = (key: string) => settings.find((s) => s.key === key)?.value;
  const isEnabled = (key: string) => get(key) === 'true';

  const pixelId = get('meta_pixel');
  const gaId = get('google_analytics');
  const gtmId = get('google_tag_manager');
  const clarityId = get('microsoft_clarity');
  const headerScript = get('custom_header_script');
  const footerScript = get('custom_footer_script');

  return (
    <>
      {isEnabled('enable_meta_pixel') && pixelId && <FacebookPixel pixelId={pixelId} />}
      {isEnabled('enable_ga4') && gaId && <GoogleAnalytics measurementId={gaId} />}
      {isEnabled('enable_gtm') && gtmId && <GoogleTagManager containerId={gtmId} />}
      {clarityId && <ClarityScript projectId={clarityId} />}
      {isEnabled('enable_custom_scripts') && headerScript && (
        <CustomScripts position="header" script={headerScript} />
      )}
      {isEnabled('enable_custom_scripts') && footerScript && (
        <CustomScripts position="footer" script={footerScript} />
      )}
    </>
  );
}
