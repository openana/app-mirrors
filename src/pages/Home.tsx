import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useMirrors } from '@/lib/client/mirrors';
import { groupBy } from '@/lib/client/utils';
import { Summary, StatusList } from '@/components/Status';
import type { MirrorEntry } from '@/lib/client/types';

interface MirrorGroup {
  name: string;
  entries: MirrorEntry[];
}

function GroupCard({
  group,
  expanded,
  onToggle,
}: {
  group: MirrorGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statuses = group.entries.map((e) => e.status);
  return (
    <div className={`group${expanded ? ' group-expanded' : ''}`}>
      <div className="group-header" onClick={onToggle}>
        <h2 className="heading">
          <span className="material-icons">
            {expanded ? 'expand_more' : 'chevron_right'}
          </span>
          {group.name}
        </h2>
        <Summary statuses={statuses} />
      </div>
      <div className="group-items">
        {expanded &&
          group.entries
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((entry) => (
              <div key={entry.name}>
                <h3>
                  <a href={entry.upstream} target="_blank" rel="noopener">
                    {entry.name}
                  </a>
                </h3>
                {entry.upstream && (
                  <div className="upstream">
                    <span className="material-icons">outbound</span>
                    {entry.upstream}
                  </div>
                )}
                <StatusList status={entry.status} lastUpdateTs={entry.last_update_ts} />
                {entry.size && (
                  <div className="size">
                    <span className="material-icons">save</span>
                    {entry.size}
                  </div>
                )}
              </div>
            ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { data: mirrors, error, isLoading } = useMirrors();
  const [filter, setFilter] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        filterInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleGroup = useCallback((name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const groups = useMemo(() => {
    if (!mirrors) return [];
    const grouped = groupBy(mirrors, (m) => m.name);
    return Object.entries(grouped)
      .map(([name, entries]) => ({
        name,
        entries,
        sortKey: name.toLowerCase(),
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [mirrors]);

  const regex = useMemo(() => {
    if (!filter) return null;
    try {
      return new RegExp(filter, 'i');
    } catch {
      return null;
    }
  }, [filter]);

  const filtered = useMemo(() => {
    if (!regex) return groups.map((g) => ({ ...g, filtered: false }));
    return groups
      .map((g) => {
        const match = regex.exec(g.name);
        return { ...g, filtered: match === null, index: match?.index ?? 1e15 };
      })
      .sort((a, b) => {
        if (a.index === b.index) return a.sortKey.localeCompare(b.sortKey);
        return (a.index ?? 0) - (b.index ?? 0);
      });
  }, [groups, regex]);

  const shownCount = filtered.filter((g) => !g.filtered).length;

  if (error) return <div className="mirrorz"><div className="toolbar">Failed to load mirrors</div></div>;
  if (isLoading) return <div className="mirrorz"><div className="toolbar">Loading...</div></div>;

  return (
    <div className="mirrorz">
      <div className="toolbar">
        <div className="search">
          <span className={`search-leading${filter ? '' : ' empty'}`}>
            <span className="material-icons" aria-hidden="true">search</span>
          </span>
          <input
            ref={filterInputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Press / to filter (regex supported)"
          />
          <button
            type="button"
            className="search-clear"
            onClick={() => setFilter('')}
            disabled={!filter}
            title="Clear filter"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        <span className="result-count">
          {shownCount} / {groups.length} mirrors
        </span>
      </div>
      <div className="mirrors">
        <div className="mirror-column">
          {filtered
            .filter((g) => !g.filtered)
            .map((group) => (
              <GroupCard
                key={group.name}
                group={group}
                expanded={expandedGroups.has(group.name)}
                onToggle={() => toggleGroup(group.name)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}