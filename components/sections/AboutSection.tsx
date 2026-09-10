export function AboutSection() {
  return (
    <div className="spotlight">
      <div className="content">
        <header className="major">
          <h2>About Mike</h2>
        </header>
        <h3>Hello!</h3>

        <strong>A little bit about myself</strong>
        <p>
          I&apos;m a full-stack developer, dabbling in a bit of everything. Lots of front-end development in React and
          Vue, and a fair share of backend crunching with Typescript in Node.js. Graduate of Iowa State and Penn State
          with almost 20 years of hobby and professional development under my belt.
        </p>

        <p>
          I am currently with{' '}
          <a href="https://www.cypress.io" rel="noopener noreferrer">
            Cypress
          </a>
          , working from Dallas, Texas.
        </p>
      </div>
      <span className="image">
        <picture>
          <source
            type="image/webp"
            srcSet="/images/optimized/mike-256.webp 256w, /images/optimized/mike-380.webp 380w"
            sizes="(max-width: 736px) 12em, (max-width: 980px) 16em, 20em"
          />
          <img
            src="/images/mike.jpg"
            alt="Mike"
            width={380}
            height={380}
            decoding="async"
            fetchPriority="high"
          />
        </picture>
      </span>
    </div>
  );
}
