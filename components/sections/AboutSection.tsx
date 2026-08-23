import Image from 'next/image';

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
        <Image src="/images/mike.png" alt="Picture of Mike" width={460} height={460} priority />
      </span>
    </div>
  );
}
