/**
 * UploadPage — one page component serves every content type.
 * The `:type` URL segment (e.g. /uploads/ebooks) picks the schema from
 * config/contentTypes.js. Unknown types fall back to the Not Found page.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { CONTENT_TYPES_BY_SLUG } from '../../config/contentTypes';
import useContentList from '../../hooks/useContentList';
import PageHeader from '../../components/ui/PageHeader';
import ContentUploadForm from '../../components/forms/ContentUploadForm';
import RecentUploads from '../../components/RecentUploads';
import NotFound from '../NotFound';
import pageStyles from '../../styles/Page.module.css';

const UploadPage = () => {
  const { type } = useParams();
  const contentType = CONTENT_TYPES_BY_SLUG[type];

  // Hooks must run unconditionally, so pass null when the type is unknown.
  const list = useContentList(contentType?.endpoints.list || null);

  if (!contentType) return <NotFound />;

  return (
    <>
      <PageHeader eyebrow={contentType.group} icon={contentType.icon} title={contentType.label} subtitle={contentType.description} />
      <div className={pageStyles.grid2}>
        {/* `key` remounts the form when switching type so no state leaks between pages */}
        <ContentUploadForm key={contentType.key} contentType={contentType} onCreated={list.prepend} />
        <RecentUploads key={`${contentType.key}-list`} contentType={contentType} {...list} onReload={list.reload} />
      </div>
    </>
  );
};

export default UploadPage;
