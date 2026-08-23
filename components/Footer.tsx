export default function Footer() {
  return (
    <footer id="footer">
      <section>
        <h2>Status</h2>
        <p>
          Mike works for Cypress.io, building tools to enable seamlessly fast, incredibly reliable, and delightfully
          easy testing for anything you can render in a browser.
        </p>
        <ul className="actions">
          <li>
            <a href="https://www.cypress.io" className="button" target="_blank" rel="noopener noreferrer">
              Learn More about Cypress
            </a>
          </li>
        </ul>
      </section>
      <section>
        <h2>Get in touch!</h2>
        <ul className="icons">
          <li>
            <a
              href="https://github.com/mike-plummer"
              className="icon fa-github alt"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <span className="label">GitHub</span>
            </a>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/plummermikej/"
              className="icon fa-linkedin alt"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <span className="label">LinkedIn</span>
            </a>
          </li>
        </ul>
      </section>
      <p className="copyright">&copy; {new Date().getFullYear()} - Mike Plummer</p>
    </footer>
  );
}
