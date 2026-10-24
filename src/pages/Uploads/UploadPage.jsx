/**
 * UploadPage — one page component serves every content section.
 * /uploads/:type picks the schema from config/contentTypes.js.
 *
 * Layout: the add/edit form on the left, the section's list on the right.
 * Clicking a row (or its pen) opens it in the form; "New" goes back to adding.
 * Filters can be preset from the URL, e.g. /uploads/events?is_approved=false.
 */
import React, { useCallback, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaDownload } from 'react-icons/fa';
import { api, getErrorMessage } from '../../api/client';
import { CONTENT_TYPES_BY_SLUG } from '../../config/contentTypes';
import useContentList from '../../hooks/useContentList';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import PageHeader from '../../components/ui/PageHeader';
import ContentForm from '../../components/forms/ContentForm';
import ContentList from '../../components/ContentList';
import NotFound from '../NotFound';
import pageStyles from '../../styles/Page.module.css';

/** Starting filters: each filter's default, overridden by ?name=value in the URL. */
const initialFilters = (contentType, search) => {
  const query = new URLSearchParams(search);
  return Object.fromEntries(
    (contentType.filters || []).map((f) => {
      const fromUrl = query.get(f.name);
      const def = typeof f.defaultValue === 'function' ? f.defaultValue() : f.defaultValue;
      return [f.name, fromUrl ?? def ?? ''];
    })
  );
};

const isMobile = () => window.matchMedia('(max-width: 1100px)').matches;

/** Everything for one section; remounted (fresh state) when the section changes. */
const ContentSection = ({ contentType }) => {
  const location = useLocation();
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(() => initialFilters(contentType, location.search));
  const [loadingBuiltin, setLoadingBuiltin] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 350);

  const list = useContentList(contentType.endpoint, { search: debouncedSearch, filters });

  const openItem = useCallback((id) => {
    setEditingId(id);
    if (isMobile()) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSaved = useCallback(
    (item, mode) => {
      list.upsert(item);
      if (mode === 'create' && item?.id !== undefined && contentType.openAfterCreate) setEditingId(item.id);
    },
    [list, contentType.openAfterCreate]
  );

  const handleDeleted = useCallback(
    (id) => {
      list.remove(id);
      if (editingId === id) setEditingId(null);
    },
    [list, editingId]
  );

  /** Arcade only: copy a game's built-in content in so it can be edited. */
  const loadBuiltin = async () => {
    setLoadingBuiltin(true);
    try {
      const gameKey = filters.game_key || undefined;
      const { data } = await api.post(contentType.loadBuiltin, gameKey ? { game_key: gameKey } : {});
      const added = Object.values(data?.added || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
      toast.success(added ? `Copied in ${added} built-in item${added === 1 ? '' : 's'}.` : 'Everything built-in is already here.');
      list.reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load the built-in content.'));
    } finally {
      setLoadingBuiltin(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={contentType.group}
        icon={contentType.icon}
        title={contentType.label}
        subtitle={contentType.description}
        actions={
          <>
            {contentType.loadBuiltin && (
              <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={loadBuiltin} disabled={loadingBuiltin} title="Copy the game's built-in content in, so it can be edited">
                <FaDownload aria-hidden="true" /> {loadingBuiltin ? 'Loading…' : filters.game_key ? 'Load built-in for this game' : 'Load built-in content'}
              </button>
            )}
            {editingId && (
              <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGradient}`} onClick={() => setEditingId(null)}>
                <FaPlus aria-hidden="true" /> New {contentType.singular.toLowerCase()}
              </button>
            )}
          </>
        }
      />

      <div className={pageStyles.grid2}>
        <ContentForm contentType={contentType} itemId={editingId} onSaved={handleSaved} onCancelEdit={() => setEditingId(null)} />
        <ContentList
          contentType={contentType}
          list={list}
          search={search}
          onSearch={setSearch}
          filters={filters}
          onFilter={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
          selectedId={editingId}
          onEdit={openItem}
          onDeleted={handleDeleted}
        />
      </div>
    </>
  );
};

const UploadPage = () => {
  const { type } = useParams();
  const contentType = CONTENT_TYPES_BY_SLUG[type];
  if (!contentType) return <NotFound />;
  return <ContentSection key={contentType.key} contentType={contentType} />;
};

export default UploadPage;
