'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import CollapsedRail from '@/components/dev/CollapsedRail';
import DevConsole from '@/components/dev/DevConsole';
import DevDebugPane from '@/components/dev/DevDebugPane';
import DevDepsPane from '@/components/dev/DevDepsPane';
import DevEditorPane from '@/components/dev/DevEditorPane';
import DevFilesPane from '@/components/dev/DevFilesPane';
import DevTopBar from '@/components/dev/DevTopBar';
import { useRoutes } from '@/hooks/use-routes';
import { cn } from '@/lib/utils';
import { findRouteForHandler, localRouteUrl } from '@/lib/route-map';

const STORAGE_KEY = 'devboy-studio-devmode-panels';

function loadPanelState() {
  if (typeof window === 'undefined') {
    return { left: true, right: true, bottom: true, deps: true };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { left: true, right: true, bottom: true, deps: true };
    return { left: true, right: true, bottom: true, deps: true, ...JSON.parse(raw) };
  } catch {
    return { left: true, right: true, bottom: true, deps: true };
  }
}

export default function DevMode({ cwd, initialPath, initialRoute, onExit }) {
  const { routes } = useRoutes();
  const [activePath, setActivePath] = useState(initialPath || '');
  const [openTabs, setOpenTabs] = useState(initialPath ? [initialPath] : []);
  const [logs, setLogs] = useState([]);
  const [panels, setPanels] = useState({ left: true, right: true, bottom: true, deps: true });

  useEffect(() => {
    setPanels(loadPanelState());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
    } catch {
      // ignore
    }
  }, [panels]);

  useEffect(() => {
    if (!initialPath) return;
    setActivePath(initialPath);
    setOpenTabs((tabs) => (tabs.includes(initialPath) ? tabs : [...tabs, initialPath]));
  }, [initialPath]);

  const activeRoute = useMemo(() => {
    const fromFile = activePath ? findRouteForHandler(routes, activePath) : null;
    if (fromFile) return fromFile;
    if (
      initialRoute?.method &&
      initialRoute?.path &&
      (!activePath || !initialRoute.handler || activePath === initialRoute.handler)
    ) {
      return initialRoute;
    }
    return null;
  }, [routes, activePath, initialRoute]);

  const appendLog = useCallback((line) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${ts}] ${line}`].slice(-200));
  }, []);

  function openFile(path) {
    setActivePath(path);
    setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
  }

  function closeTab(path) {
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => t !== path);
      if (activePath === path) {
        setActivePath(next[next.length - 1] || '');
      }
      return next;
    });
  }

  function toggle(key) {
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <DevTopBar
        cwd={cwd}
        onExit={onExit}
        showLeft={panels.left}
        showRight={panels.right}
        showBottom={panels.bottom}
        onToggleLeft={() => toggle('left')}
        onToggleRight={() => toggle('right')}
        onToggleBottom={() => toggle('bottom')}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          {!panels.left ? (
            <CollapsedRail label="Files" side="left" onExpand={() => toggle('left')} />
          ) : (
            <div className="flex w-64 shrink-0 flex-col border-r border-border">
              <div
                className={cn(
                  'min-h-0 overflow-hidden',
                  panels.deps ? 'flex-[3]' : 'flex-1'
                )}
              >
                <DevFilesPane
                  activePath={activePath}
                  onOpen={openFile}
                  onCollapse={() => toggle('left')}
                />
              </div>
              <div
                className={cn(
                  'shrink-0 overflow-hidden border-t border-border',
                  panels.deps ? 'min-h-0 flex-[2]' : 'h-8'
                )}
              >
                <DevDepsPane
                  collapsed={!panels.deps}
                  onToggle={() => toggle('deps')}
                />
              </div>
            </div>
          )}

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden border-r border-border">
            <DevEditorPane
              openTabs={openTabs}
              activePath={activePath}
              onSelectTab={setActivePath}
              onCloseTab={closeTab}
              routeUrl={activeRoute ? localRouteUrl(activeRoute) : null}
              handlerHint={activePath || null}
            />
          </div>

          {!panels.right ? (
            <CollapsedRail label="Debug" side="right" onExpand={() => toggle('right')} />
          ) : (
            <div className="w-[22rem] shrink-0 overflow-hidden">
              <DevDebugPane
                route={activeRoute}
                onLog={appendLog}
                onCollapse={() => toggle('right')}
              />
            </div>
          )}
        </div>

        <div
          className={cn(
            'shrink-0 border-t border-border',
            panels.bottom ? 'h-44' : 'h-8'
          )}
        >
          <DevConsole
            logs={logs}
            onClear={() => setLogs([])}
            collapsed={!panels.bottom}
            onToggle={() => toggle('bottom')}
          />
        </div>
      </div>
    </div>
  );
}
