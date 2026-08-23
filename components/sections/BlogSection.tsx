import Link from 'next/link';

export function BlogSection() {
  return (
    <div className="content">
      <header className="major">
        <h2>Blog</h2>
      </header>
      <p>I also (used to) write blog posts</p>
      <footer className="major">
        <ul className="actions">
          <li>
            <Link href="/blog" className="button special">
              Archive
            </Link>
          </li>
        </ul>
      </footer>
    </div>
  );
}
