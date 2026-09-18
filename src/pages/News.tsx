import { Link } from 'react-router';
import { getAllPosts } from '@/lib/news';
import { useTranslation } from '@/i18n';

export default function News() {
  const posts = getAllPosts();
  const { t } = useTranslation();

  return (
    <div className="news-list">
      <h1>{t('news.title')}</h1>
      {posts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('news.empty')}</p>
      ) : (
        posts.map((post) => (
          <div className="news-item" key={post.slug}>
            <h2>
              <Link to={`/news/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="news-date">{post.date}</p>
            {post.summary && <p className="news-summary">{post.summary}</p>}
          </div>
        ))
      )}
    </div>
  );
}