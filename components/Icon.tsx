import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { CSSProperties } from 'react';
import { getFontAwesomeIcon } from '@/lib/fontawesome-icons';
import { iconClassNames } from '@/lib/icons';

interface IconProps {
  icon: string;
  className?: string;
  style?: CSSProperties;
  /** Render only the inner glyph; parent must provide `.icon` classes (e.g. footer links). */
  bare?: boolean;
}

function isLogoIcon(icon: string): boolean {
  return icon.trim().startsWith('logo ');
}

function usesGlyphWrapper(className: string): boolean {
  return /\b(major|minor|alt)\b/.test(className);
}

export function Icon({ icon, className = '', style, bare = false }: IconProps) {
  const faIcon = getFontAwesomeIcon(icon);

  if (faIcon) {
    const glyph = <FontAwesomeIcon icon={faIcon} aria-hidden="true" />;

    if (bare) {
      return <span className="icon__glyph">{glyph}</span>;
    }

    const classes = iconClassNames(icon, className)
      .split(/\s+/)
      .filter((part) => part !== 'fa' && !part.startsWith('fa-'))
      .join(' ');

    if (usesGlyphWrapper(className)) {
      return (
        <span className={classes} style={style}>
          <span className="icon__glyph">{glyph}</span>
        </span>
      );
    }

    return (
      <span className={classes} style={style}>
        {glyph}
      </span>
    );
  }

  if (isLogoIcon(icon)) {
    return <span className={iconClassNames(icon, className)} style={style} />;
  }

  return null;
}
