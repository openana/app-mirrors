import { Link } from 'react-router';
import { getAllPosts } from '@/lib/news';

export default function News() {
  const posts = getAllPosts();

  return (
    <div className="news-list">
      <h1>News &amp; Announcements</h1>
      {posts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No news posts yet.</p>
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