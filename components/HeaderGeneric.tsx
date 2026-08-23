interface HeaderGenericProps {
  title: string;
  subtitle?: string;
}

export default function HeaderGeneric({ title, subtitle }: HeaderGenericProps) {
  return (
    <header id="header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
