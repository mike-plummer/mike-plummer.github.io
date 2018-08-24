import React from 'react';
import Link from 'gatsby-link';

const Footer = props => (
  <footer id="footer">
    <section>
      <h2>Object Partners</h2>
      <p>
        Mike works for Object Partners Inc. (OPI), a custom software consultancy based in Minneapolis.
        OPI specializes in JVM, UI, and Mobile development by partnering with clients to provide
        expertise and/or deliver full solutions.
      </p>
      <ul className="actions">
        <li>
          <a href="https://objectpartners.com" className="button" target="_blank">
            Learn More about OPI
          </a>
        </li>
      </ul>
    </section>
    <section>
      <h2>Get in touch!</h2>
      <dl className="alt">
        <dt>Email</dt>
        <dd>
          <a href="#">plummer.mike.j-at-gmail.com</a>
        </dd>
      </dl>
      <ul className="icons">
        <li>
          <a href="https://twitter.com/plummer_mike" className="icon fa-twitter alt">
            <span className="label">Twitter</span>
          </a>
        </li>
        <li>
          <a href="https://github.com/mike-plummer" className="icon fa-github alt">
            <span className="label">GitHub</span>
          </a>
        </li>
        <li>
          <a href="https://www.linkedin.com/in/plummermikej/" className="icon fa-linkedin alt">
            <span className="label">LinkedIn</span>
          </a>
        </li>
      </ul>
    </section>
    <p className="copyright">
      &copy; {new Date().getFullYear()} -  Mike Plummer
    </p>
  </footer>
);

export default Footer;
