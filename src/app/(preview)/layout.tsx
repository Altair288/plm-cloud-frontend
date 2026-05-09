'use client';
import React, { useEffect, useState } from 'react';
import '@cds/core/global.min.css';
import '@clr/icons/clr-icons.min.css';
import '@clr/ui/clr-ui.min.css';

export default function ClarityPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ensure icons and web components are loaded only in the browser
    import('@cds/core/icon/register.js');
    import('@cds/core/icon').then(({ loadCoreIconSet, loadEssentialIconSet, loadTechnologyIconSet }) => {
      loadCoreIconSet();
      loadEssentialIconSet();
      loadTechnologyIconSet();
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

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