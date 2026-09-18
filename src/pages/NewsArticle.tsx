import { useParams, Link } from 'react-router';
import { getPostBySlug } from '@/lib/news';

export default function NewsArticle() {
  const { slug } = useParams();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="news-article">
        <p>Article not found. <Link to="/news/">Back to news</Link></p>
      </div>
    );
  }

  return (
    <div className="news-article">
      <Link to="/news/" style={{ fontSize: 14, marginBottom: 16, display: 'inline-block' }}>
        ← Back to news
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