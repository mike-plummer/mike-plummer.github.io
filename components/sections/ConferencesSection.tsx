import Link from 'next/link';

export function ConferencesSection() {
  return (
    <>
      <header className="major">
        <h2>Conferences</h2>
        <p>I used to speak at conferences (no longer)</p>
      </header>
      <footer className="major">
        <ul className="actions">
          <li>
            <Link href="/conferences" className="button special">
              Archive
            </Link>
          </li>
        </ul>
      </footer>
    </>
  );
}
