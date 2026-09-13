export default function Header() {
  return (
    <header id="header" className="alt">
      <span className="style5 icon minor header-logo">
        <span className="icon__glyph">
          <picture>
            <source type="image/webp" srcSet="/images/optimized/texas.webp" />
            <img src="/images/texas.png" alt="Texas" width={128} height={128} />
          </picture>
        </span>
      </span>
      <h1>Mike Plummer</h1>
      <p>Full-stack developer, North Texas</p>
    </header>
  );
}
