'use client';
import React, { useEffect } from 'react';
import '@cds/core/global.min.css';
import '@clr/icons/clr-icons.min.css';
import '@clr/ui/clr-ui.min.css';
import { loadCoreIconSet, loadEssentialIconSet, loadTechnologyIconSet } from '@cds/core/icon';

export default function ClarityPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Ensure icons are loaded in the browser
    loadCoreIconSet();
    loadEssentialIconSet();
    loadTechnologyIconSet();
  }, []);

  return (
    <div className="clarity-preview-scope">
      {/* 
        This wrapper helps isolate the preview somewhat.
        Note: Clarity global CSS may still affect some raw HTML tags globally. 
        It is rendered on a separate route /clarity-demo to avoid DOM conflict with unified layout.
      */}
      {children}
    </div>
  );
}