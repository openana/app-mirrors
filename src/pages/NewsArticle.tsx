import { useParams, Link } from 'react-router';
import { getPostBySlug } from '@/lib/news';
import { useTranslation } from '@/i18n';

export default function NewsArticle() {
  const { slug } = useParams();
  const post = slug ? getPostBySlug(slug) : undefined;
  const { t } = useTranslation();

  if (!post) {
    return (
      <div className="news-article">
        <p>{t('news.articleNotFound')} <Link to="/news/">{t('news.backToNews')}</Link></p>
      </div>
    );
  }

  return (
    <div className="news-article">
      <Link to="/news/" style={{ fontSize: 14, marginBottom: 16, display: 'inline-block' }}>
        {t('news.backArrow')}
      </Link>
      <p className="news-date">{post.date}</p>
      <h1>{post.title}</h1>
      <div
        className="news-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </div>
  );
}