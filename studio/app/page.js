'use client';

import { useState } from 'react';

import AppSidebar from '@/components/app-sidebar';
import DevMode from '@/components/DevMode';
import FunctionsPanel from '@/components/FunctionsPanel';
import OverviewPanel from '@/components/OverviewPanel';
import RoutesPanel from '@/components/RoutesPanel';
import StudioHeader from '@/components/studio-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudioConfig } from '@/hooks/use-studio-config';

export default function StudioPage() {
  const [section, setSection] = useState('overview');
  const [devSeed, setDevSeed] = useState({ path: '', route: null });
  const { catalog, config, setConfig, cwd, error, loading } = useStudioConfig();

  function openDev({ path, route } = {}) {
    setDevSeed({ path: path || '', route: route || null });
    setSection('dev');
  }

  function handleNavigate(id) {
    if (id === 'dev') {
      openDev({});
      return;
    }
    setSection(id);
  }

  if (section === 'dev') {
    return (
      <DevMode
        key={devSeed.path || 'dev'}
        cwd={cwd}
        initialPath={devSeed.path}
        initialRoute={devSeed.route}
        onExit={() => setSection('overview')}
      />
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar section={section} onNavigate={handleNavigate} cwd={cwd} />
      <SidebarInset>
        <StudioHeader section={section} cwd={cwd} />
        <div className="flex flex-1 flex-col overflow-auto p-4 md:p-6">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Studio error</AlertTitle>
              <AlertDescription className="font-mono text-xs whitespace-pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          ) : null}

          {loading || !catalog || !config ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96 max-w-full" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
            </div>
          ) : (
            <>
              {section === 'overview' ? (
                <OverviewPanel catalog={catalog} config={config} setConfig={setConfig} cwd={cwd} />
              ) : null}
              {section === 'routes' ? (
                <RoutesPanel
                  onOpenHandler={(handler) => openDev({ path: handler })}
                  onDebug={(route) => openDev({ path: route.handler, route })}
                />
              ) : null}
              {section === 'functions' ? (
                <FunctionsPanel onOpenEditor={() => openDev({})} />
              ) : null}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
