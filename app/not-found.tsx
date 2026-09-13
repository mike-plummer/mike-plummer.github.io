import SiteLayout from '@/components/SiteLayout';

export default function NotFound() {
  return (
    <SiteLayout>
      <div id="main">
        <section id="content" className="main">
          <h1>Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
        </section>
      </div>
    </SiteLayout>
  );
}
