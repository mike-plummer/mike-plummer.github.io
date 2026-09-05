import Image from 'next/image';
import { aboutCopy } from '@/lib/profile';

export function AboutSection() {
  return (
    <div className="spotlight">
      <div className="content">
        <header className="major">
          <h2>{aboutCopy.heading}</h2>
        </header>
        <h3>{aboutCopy.greeting}</h3>

        <strong>{aboutCopy.introTitle}</strong>
        <p>{aboutCopy.intro}</p>

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
